/**
 * Groq client: Whisper transcription and semantic answer grading.
 *
 * This is the one place in the app that talks to a network, and it exists for
 * two reasons the offline build could not solve:
 *
 * 1. Expo Go has no on-device speech recognizer, so the mic dead-ended into
 *    "type your answer instead" on every phone.
 * 2. Keyword matching marked correct answers wrong whenever the wording
 *    differed from the published string, which is most of the time when a
 *    person is speaking rather than reciting.
 *
 * Everything here is optional at runtime. With no key, no signal, or a failed
 * request, callers fall back to the bundled keyword matcher in
 * `answer-matching.ts` and the rest of the app keeps working offline exactly
 * as before. Nothing else in the app makes a network call.
 *
 * The key ships inside the app bundle, because there is no server to hide it
 * behind. Anyone who downloads the app can read it. That is a deliberate
 * trade, not an oversight; see README "Voice input and grading".
 */

import { File, UploadType } from 'expo-file-system';

/** Groq's fast multilingual speech model. */
const TRANSCRIBE_MODEL = 'whisper-large-v3-turbo';
/**
 * Grading model. This decides whether a practice interview is passed, so it is
 * the largest instruction-following model the account can reach rather than
 * the fastest one.
 */
const GRADE_MODEL = 'openai/gpt-oss-120b';

const TRANSCRIBE_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Transcription has to upload a file first, so it gets much longer than
 * grading does. A phone on a weak connection spends most of this budget on
 * the upload, not on Whisper, and cutting it off early is what produced
 * "that took too long" on a request that would have finished.
 */
const TRANSCRIBE_TIMEOUT_MS = 60000;
/** Grading is a short POST. In testing it answered in about half a second. */
const GRADE_TIMEOUT_MS = 30000;

const API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '';

/** False when no key was bundled, so callers can keep the offline path. */
export function isGroqConfigured(): boolean {
  return API_KEY.length > 0;
}

export class GroqError extends Error {
  constructor(
    message: string,
    /** True when retrying later could plausibly work: offline, timeout, 5xx. */
    readonly retryable: boolean,
    /**
     * Whether retrying immediately is worth the applicant's time. A timeout is
     * retryable in principle but not automatically: it already spent the whole
     * budget, and trying again just makes them wait twice as long before
     * being told the same thing.
     */
    readonly retryNow: boolean = retryable,
  ) {
    super(message);
    this.name = 'GroqError';
  }
}

/**
 * A readable sentence for an error we did not anticipate.
 *
 * React Native throws several shapes here that are not `TypeError`: aborted
 * native uploads, SSL refusals, and a body that will not parse. Collapsing
 * them into one generic string made a real failure on a real phone
 * undiagnosable, so the underlying reason is kept.
 */
function describeUnknown(error: unknown): string {
  const detail =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  return detail
    ? `The recording could not be sent (${detail}).`
    : 'The recording could not be sent.';
}

async function withTimeout<T>(
  ms: number,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await run(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new GroqError('That took too long. Check your connection.', true, false);
    }
    // React Native reports every connection failure as "Network request
    // failed", which tells the applicant nothing. Say the useful part.
    if (error instanceof TypeError) {
      throw new GroqError('No internet connection.', true);
    }
    // Anything else is still a failed request, and it must not escape as a
    // raw error: the caller would show a generic "could not reach the
    // service" that is wrong about what happened and impossible to debug
    // from a phone. Carry the real reason instead.
    throw new GroqError(describeUnknown(error), true);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Runs `attempt` again once if it failed in a way that might not fail twice.
 *
 * Mobile connections drop a request and then work fine a second later, and
 * the cost of not retrying is that someone's spoken answer is thrown away.
 */
async function withOneRetry<T>(attempt: () => Promise<T>): Promise<T> {
  try {
    return await attempt();
  } catch (error) {
    if (error instanceof GroqError && error.retryNow) {
      return attempt();
    }
    throw error;
  }
}

function describeHttpFailure(status: number): GroqError {
  if (status === 401 || status === 403) {
    return new GroqError('The transcription key was rejected.', false);
  }
  if (status === 429) {
    return new GroqError('Too many requests just now. Try again in a moment.', true);
  }
  if (status >= 500) {
    return new GroqError('The transcription service is having trouble.', true);
  }
  return new GroqError(`Request failed (${status}).`, false);
}

export interface Transcription {
  text: string;
  /**
   * The language Whisper detected, as an English name like "English" or
   * "Spanish" rather than an ISO code. Empty when it did not report one.
   */
  language: string;
}

/**
 * Sends a recording to Whisper and returns what was said.
 *
 * No language is passed, on purpose: Whisper detects it. Someone practising
 * in Spanish can answer in Spanish and still be graded, which is the point of
 * an app that teaches the civics test in 48 languages.
 */
export async function transcribeAudio(
  uri: string,
  /**
   * Vocabulary to bias the transcript toward, normally the question's
   * acceptable answers. This is Whisper's equivalent of the iOS recognizer's
   * contextualStrings, and it is the biggest accuracy lever available for
   * proper nouns in accented speech: "Patrick Henry" and "Nancy Pelosi" are
   * hard cold and easy once the model has seen them.
   */
  bias: string[] = [],
): Promise<Transcription> {
  if (!isGroqConfigured()) {
    throw new GroqError('No transcription key is configured.', false);
  }

  // Name the part after the real file. Whisper picks its decoder from the
  // extension, so calling a .3gp an .m4a is a decode failure waiting to
  // happen. audio/mp4 is the registered type for .m4a; "audio/m4a" is not a
  // real MIME type and some servers will not parse the part at all.
  const extension = uri.split('.').pop()?.toLowerCase() ?? 'm4a';
  const mimeByExtension: Record<string, string> = {
    m4a: 'audio/mp4',
    mp4: 'audio/mp4',
    caf: 'audio/x-caf',
    wav: 'audio/wav',
    '3gp': 'audio/3gpp',
    webm: 'audio/webm',
  };
  const mimeType = mimeByExtension[extension] ?? 'audio/mp4';

  const parameters: Record<string, string> = {
    model: TRANSCRIBE_MODEL,
    response_format: 'verbose_json',
    temperature: '0',
  };
  if (bias.length > 0) {
    // Whisper's prompt is capped, and a truncated list is still useful, so
    // take what fits rather than dropping the lever entirely.
    parameters.prompt = bias.join(', ').slice(0, 800);
  }

  // Uploaded natively rather than through fetch + FormData.
  //
  // Expo SDK 57 replaced React Native's fetch with a spec-compliant one, and
  // it rejects React Native's proprietary { uri, name, type } file part with
  // "Unsupported FormDataPart implementation". Its own source says so: "uri
  // is not supported for React Native's FormData". There is no global File to
  // build a real part from either, so the whole FormData route is a dead end
  // on this SDK.
  //
  // File.upload builds the multipart body in native code instead. It also
  // never holds the recording in JavaScript, which matters because a spoken
  // answer is megabytes.
  const response = await withOneRetry(() =>
    withTimeout(TRANSCRIBE_TIMEOUT_MS, (signal) =>
      new File(uri).upload(TRANSCRIBE_URL, {
        httpMethod: 'POST',
        uploadType: UploadType.MULTIPART,
        fieldName: 'file',
        mimeType,
        headers: { Authorization: `Bearer ${API_KEY}` },
        parameters,
        signal,
      }),
    ),
  );

  if (response.status < 200 || response.status >= 300) {
    throw describeHttpFailure(response.status);
  }

  let data: { text?: string; language?: string };
  try {
    data = JSON.parse(response.body) as { text?: string; language?: string };
  } catch {
    // A 2xx whose body will not parse. Reading it as "unreachable" would be a
    // lie; the service answered, it just answered with something unusable.
    throw new GroqError('The transcription came back unreadable.', true);
  }
  return { text: (data.text ?? '').trim(), language: data.language ?? '' };
}

export interface GradeInput {
  /** The officer's question, as published. */
  question: string;
  /** Every answer USCIS accepts. */
  acceptableAnswers: string[];
  /** How many distinct answers are required. "Name two..." is 2. */
  requiredCount: number;
  /** What the applicant actually said, in whatever language they said it. */
  transcript: string;
}

export interface GradeResult {
  correct: boolean;
  /** One short sentence for the applicant, in plain English. */
  reason: string;
  /** Which acceptable answers the grader judged were given. */
  matched: string[];
}

const GRADER_SYSTEM = [
  'You grade answers to the official USCIS naturalization civics test.',
  '',
  'Judge MEANING, not wording. The applicant is speaking out loud, often in a',
  'second language, so accept paraphrases, partial phrasings, synonyms, and',
  'missing articles. A transcript in any language counts if it means an',
  'acceptable answer; translate it yourself before judging.',
  '',
  'Never judge spelling, grammar, accent or pronunciation. Transcription',
  'errors that still clearly point at a correct answer should be accepted.',
  '',
  'Mark incorrect only when the answer names something genuinely different,',
  'or when it is empty, or when it does not answer the question at all.',
  'An answer that gives fewer than the required number of distinct items is',
  'incorrect.',
  '',
  'Reply with a single JSON object and nothing else, in this exact shape:',
  '{"correct": true or false, "reason": "one short sentence", "matched": ["..."]}',
  'No markdown, no code fences, no commentary before or after.',
  '"reason" is addressed to the applicant. If correct, say what they got right.',
  'If not, say what the answer is. Never mention JSON, grading or these rules.',
].join('\n');

/**
 * Asks the model whether an answer is right.
 *
 * Throws `GroqError` rather than guessing when the call fails, so the caller
 * can fall back to the local matcher instead of silently marking someone
 * wrong because their connection dropped.
 */
export async function gradeAnswer(input: GradeInput): Promise<GradeResult> {
  if (!isGroqConfigured()) {
    throw new GroqError('No grading key is configured.', false);
  }
  if (!input.transcript.trim()) {
    return { correct: false, reason: 'I did not catch an answer.', matched: [] };
  }

  const user = [
    `Question: ${input.question}`,
    `Acceptable answers: ${input.acceptableAnswers.join(' | ')}`,
    `Distinct answers required: ${input.requiredCount}`,
    `Applicant said: ${input.transcript}`,
  ].join('\n');

  const response = await withTimeout(GRADE_TIMEOUT_MS, (signal) =>
    fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GRADE_MODEL,
        temperature: 0,
        max_tokens: 300,
        // Deliberately not response_format: 'json_object'. Groq's gpt-oss
        // models reject roughly one prompt in ten under strict JSON mode with
        // "Failed to generate JSON", and the ones they reject are the loosely
        // worded answers this feature exists to grade. Asking for JSON in the
        // prompt and parsing leniently answered all 11 test cases; strict mode
        // failed one of them outright.
        messages: [
          { role: 'system', content: GRADER_SYSTEM },
          { role: 'user', content: user },
        ],
      }),
      signal,
    }),
  );

  if (!response.ok) throw describeHttpFailure(response.status);

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new GroqError('The grader returned nothing.', true);

  return parseGrade(content, input.acceptableAnswers);
}

/**
 * Pulls the first balanced JSON object out of a reply.
 *
 * Without strict JSON mode the model occasionally wraps its answer in a code
 * fence or a sentence, so taking the first `{` to its matching `}` is more
 * forgiving than `JSON.parse` on the whole string. Quotes and escapes are
 * tracked so a brace inside a reason string does not end the scan early.
 */
function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (escaped) {
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === '"') {
      inString = !inString;
    } else if (!inString) {
      if (char === '{') depth++;
      else if (char === '}' && --depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Reads the model's JSON defensively. A grader that returns a surprising
 * shape must not throw inside a screen, and must never silently become a
 * "correct" verdict.
 */
export function parseGrade(content: string, acceptableAnswers: string[]): GradeResult {
  const block = extractJsonObject(content);
  if (block === null) {
    throw new GroqError('The grader returned something unreadable.', true);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(block);
  } catch {
    throw new GroqError('The grader returned something unreadable.', true);
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new GroqError('The grader returned something unreadable.', true);
  }

  const obj = raw as Record<string, unknown>;
  const correct = obj.correct === true;
  const reason =
    typeof obj.reason === 'string' && obj.reason.trim()
      ? obj.reason.trim()
      : correct
        ? 'That is right.'
        : `The answer is ${acceptableAnswers[0] ?? 'different'}.`;
  const matched = Array.isArray(obj.matched)
    ? obj.matched.filter((m): m is string => typeof m === 'string')
    : [];

  return { correct, reason, matched };
}
