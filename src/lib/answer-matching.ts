/**
 * answer-matching.ts
 *
 * Scores a speech transcript against the acceptable answers for a USCIS civics
 * question.
 *
 * Design premise: USCIS officers grade for comprehension, not precision. The
 * policy manual is explicit that applicants may make errors in pronunciation,
 * spelling and grammar and still pass. So this matcher looks for the presence
 * of an acceptable answer's content words, tolerant of transcription noise --
 * it is deliberately NOT a pronunciation scorer. Penalising an accent here
 * would make the app worse than useless for the people who need it.
 *
 * Pure functions, no React, no native dependencies. Testable in isolation.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CivicsQuestion {
  id: string;
  prompt: string;
  /** Acceptable answer strings exactly as published by USCIS. */
  acceptableAnswers: string[];
  /**
   * How many DISTINCT acceptable answers the applicant must produce.
   * "Name two national U.S. holidays" -> 2. Defaults to 1.
   */
  requiredCount?: number;
  /**
   * Tokens that, if present, disqualify a match. Use for known confusions
   * where a wrong answer contains the right answer as a substring --
   * e.g. an answer of "the President" should not be satisfied by the
   * transcript "the Vice President".
   */
  negativeTokens?: string[];
  /** Answer changes with elections or appointments. Verify before each cycle. */
  dynamic?: boolean;
}

export interface AnswerMatch {
  /** The acceptable answer this describes. */
  answer: string;
  /** Fraction of the answer's content tokens found in the transcript, 0..1. */
  score: number;
  /** True when every content token matched with zero edit distance. */
  exact: boolean;
  /** Content tokens the transcript did not contain. */
  missingTokens: string[];
}

export interface MatchResult {
  correct: boolean;
  /** Acceptable answers judged to have been given. */
  matched: AnswerMatch[];
  /** Strongest candidate even when incorrect -- drives the feedback copy. */
  best: AnswerMatch | null;
  /** Scored above the partial threshold but below correct. */
  close: boolean;
  requiredCount: number;
  transcriptEmpty: boolean;
  normalizedTranscript: string;
}

export interface MatchOptions {
  /** Score at or above which a near-miss is reported as "close". */
  partialThreshold?: number;
  /** Disable fuzzy token matching. Useful in tests. */
  strict?: boolean;
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

const CONTRACTIONS: Record<string, string> = {
  "don't": "do not",
  "doesn't": "does not",
  "isn't": "is not",
  "aren't": "are not",
  "wasn't": "was not",
  "can't": "cannot",
  "won't": "will not",
  "it's": "it is",
  "that's": "that is",
  "there's": "there is",
  "they're": "they are",
  "we're": "we are",
  "i'm": "i am",
  "he's": "he is",
  "she's": "she is",
};

/** Leading hedges people say before the real answer. Stripped from the front only. */
const LEADING_HEDGES = [
  "i think",
  "i believe",
  "i guess",
  "i would say",
  "the answer is",
  "it is",
  "maybe",
  "probably",
];

/** Disfluencies. Safe to remove anywhere -- none of these appear in civics answers. */
const DISFLUENCIES = new Set([
  "uh",
  "um",
  "er",
  "ah",
  "eh",
  "hmm",
  "mmm",
  "mm",
]);

/**
 * Grammatical words dropped before matching. Kept deliberately short: dropping
 * too much creates false positives, since a short answer's remaining tokens
 * become easy to find inside an unrelated transcript.
 */
const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "of",
  "and",
  "or",
  "to",
  "in",
  "on",
  "for",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "that",
  "this",
  "it",
  "its",
]);

const ONES: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

function isNumberWord(w: string): boolean {
  return w in ONES || w in TENS || w === "hundred" || w === "thousand";
}

/**
 * Collapses spelled-out numbers into digits so that "twenty seven" and "27"
 * compare equal. Also handles the year idiom -- "seventeen seventy six"
 * becomes 1776 rather than 17 and 76.
 */
function collapseNumbers(tokens: string[]): string[] {
  const out: string[] = [];
  let i = 0;

  while (i < tokens.length) {
    if (!isNumberWord(tokens[i])) {
      out.push(tokens[i]);
      i += 1;
      continue;
    }

    // Consume a maximal run of number words.
    const run: string[] = [];
    while (i < tokens.length && isNumberWord(tokens[i])) {
      run.push(tokens[i]);
      i += 1;
    }

    out.push(...parseNumberRun(run));
  }

  return out;
}

function parseNumberRun(run: string[]): string[] {
  // Year idiom: two chunks, each under 100, first chunk 10..99.
  // "seventeen seventy six" -> 1776. "nineteen eighty" -> 1980.
  const chunks = splitAdditiveChunks(run);
  if (
    chunks.length === 2 &&
    chunks[0] >= 10 &&
    chunks[0] <= 99 &&
    chunks[1] >= 0 &&
    chunks[1] <= 99 &&
    !run.includes("hundred") &&
    !run.includes("thousand")
  ) {
    return [String(chunks[0] * 100 + chunks[1])];
  }

  let total = 0;
  let current = 0;
  for (const w of run) {
    if (w in ONES) current += ONES[w];
    else if (w in TENS) current += TENS[w];
    else if (w === "hundred") current = (current || 1) * 100;
    else if (w === "thousand") {
      total += (current || 1) * 1000;
      current = 0;
    }
  }
  return [String(total + current)];
}

/** Splits a number-word run into the values it would produce if read separately. */
function splitAdditiveChunks(run: string[]): number[] {
  const chunks: number[] = [];
  let current = 0;
  let sawTens = false;

  for (const w of run) {
    if (w in TENS) {
      if (current > 0) chunks.push(current);
      current = TENS[w];
      sawTens = true;
    } else if (w in ONES) {
      if (sawTens && ONES[w] < 10) {
        current += ONES[w];
        sawTens = false;
      } else {
        if (current > 0) chunks.push(current);
        current = ONES[w];
      }
    }
  }
  if (current > 0) chunks.push(current);
  return chunks;
}

/** Lowercase, expand contractions, strip punctuation and disfluencies. */
export function normalize(text: string): string {
  let s = text.toLowerCase().trim();

  for (const [from, to] of Object.entries(CONTRACTIONS)) {
    s = s.split(from).join(to);
  }

  // Keep intra-word hyphens as separators; drop everything else non-alphanumeric.
  s = s.replace(/[^a-z0-9\s-]/g, " ").replace(/-/g, " ");
  s = s.replace(/\s+/g, " ").trim();

  for (const hedge of LEADING_HEDGES) {
    if (s.startsWith(hedge + " ")) {
      s = s.slice(hedge.length + 1);
      break;
    }
  }

  const tokens = s
    .split(" ")
    .filter((t) => t.length > 0 && !DISFLUENCIES.has(t));
  return collapseNumbers(tokens).join(" ");
}

/** Normalised tokens with grammatical words removed. */
export function contentTokens(text: string): string[] {
  const normalized = normalize(text);
  if (!normalized) return [];
  const tokens = normalized.split(" ").filter((t) => !STOPWORDS.has(t));
  // An answer made entirely of stopwords ("We the People") keeps its tokens.
  return tokens.length > 0 ? tokens : normalized.split(" ");
}

// ---------------------------------------------------------------------------
// Fuzzy token comparison
// ---------------------------------------------------------------------------

/** Levenshtein distance, abandoning early once `max` is exceeded. */
export function editDistance(a: string, b: string, max: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    [prev, curr] = [curr, prev];
  }

  return prev[b.length];
}

/**
 * Tolerance scales with word length. Short words get none: "war" and "was"
 * differ by one edit but mean entirely different things.
 */
function tolerance(token: string): number {
  if (token.length <= 4) return 0;
  if (token.length <= 7) return 1;
  return 2;
}

function tokenPresent(
  needle: string,
  haystack: string[],
  strict: boolean,
): { found: boolean; exact: boolean } {
  if (haystack.includes(needle)) return { found: true, exact: true };
  if (strict) return { found: false, exact: false };

  const max = tolerance(needle);
  if (max === 0) return { found: false, exact: false };

  for (const t of haystack) {
    if (editDistance(needle, t, max) <= max)
      return { found: true, exact: false };
  }
  return { found: false, exact: false };
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

function scoreAnswer(
  answer: string,
  transcriptTokens: string[],
  strict: boolean,
): AnswerMatch {
  const needed = contentTokens(answer);
  if (needed.length === 0) {
    return { answer, score: 0, exact: false, missingTokens: [] };
  }

  const missing: string[] = [];
  let found = 0;
  let allExact = true;

  for (const token of needed) {
    const result = tokenPresent(token, transcriptTokens, strict);
    if (result.found) {
      found += 1;
      if (!result.exact) allExact = false;
    } else {
      missing.push(token);
    }
  }

  return {
    answer,
    score: found / needed.length,
    exact: allExact && missing.length === 0,
    missingTokens: missing,
  };
}

/**
 * Scores a transcript against one question.
 *
 * An acceptable answer counts as given when every one of its content tokens
 * appears in the transcript. Where several acceptable answers match, the one
 * with the most content tokens wins -- this is what stops "the Vice President"
 * from satisfying an answer of "the President" whenever both are in the pool.
 * For confusions the pool does not cover, set `negativeTokens` on the question.
 */
export function matchAnswer(
  transcript: string,
  question: CivicsQuestion,
  options: MatchOptions = {},
): MatchResult {
  const { partialThreshold = 0.5, strict = false } = options;
  const requiredCount = question.requiredCount ?? 1;
  const normalizedTranscript = normalize(transcript);
  const transcriptTokens = normalizedTranscript.split(" ").filter(Boolean);

  const empty = transcriptTokens.length === 0;
  if (empty) {
    return {
      correct: false,
      matched: [],
      best: null,
      close: false,
      requiredCount,
      transcriptEmpty: true,
      normalizedTranscript,
    };
  }

  const blocked = (question.negativeTokens ?? []).some(
    (t) => tokenPresent(normalize(t), transcriptTokens, strict).found,
  );

  const scored = question.acceptableAnswers
    .map((a) => scoreAnswer(a, transcriptTokens, strict))
    .sort((x, y) => {
      if (y.score !== x.score) return y.score - x.score;
      return contentTokens(y.answer).length - contentTokens(x.answer).length;
    });

  const matched = blocked ? [] : scored.filter((m) => m.score === 1);

  // Drop matches wholly contained in a longer match -- "President" inside
  // "Vice President" -- so a single utterance is not counted twice.
  const deduped: AnswerMatch[] = [];
  for (const m of matched) {
    const tokens = new Set(contentTokens(m.answer));
    const subsumed = deduped.some((kept) => {
      const keptTokens = contentTokens(kept.answer);
      return (
        keptTokens.length > tokens.size &&
        [...tokens].every((t) => keptTokens.includes(t))
      );
    });
    if (!subsumed) deduped.push(m);
  }

  const best = scored[0] ?? null;
  const correct = deduped.length >= requiredCount;

  return {
    correct,
    matched: deduped,
    best,
    close: !correct && best !== null && best.score >= partialThreshold,
    requiredCount,
    transcriptEmpty: false,
    normalizedTranscript,
  };
}

// ---------------------------------------------------------------------------
// Recognizer biasing
// ---------------------------------------------------------------------------

/**
 * Phrases to hand the speech recognizer as contextual hints before asking a
 * question. iOS SFSpeechRecognizer takes these as `contextualStrings` and
 * weights them heavily; this is the single largest accuracy win available for
 * accented speech, because the acceptable answers are known in advance.
 * Android's biasing support is weaker -- lean on fuzzy matching there.
 */
export function biasStringsFor(question: CivicsQuestion, limit = 40): string[] {
  const phrases = new Set<string>();

  for (const answer of question.acceptableAnswers) {
    phrases.add(answer);
    for (const token of contentTokens(answer)) {
      if (token.length > 3 && !/^\d+$/.test(token)) phrases.add(token);
    }
  }

  return [...phrases].slice(0, limit);
}

/** Feedback copy for the review screen. Keep it plain; the audience is stressed. */
export function feedbackFor(
  result: MatchResult,
  question: CivicsQuestion,
): string {
  if (result.transcriptEmpty) return "No answer was heard. Try again.";
  if (result.correct) return "Correct.";
  if (result.close && result.best) {
    return `Close. A full answer is: ${result.best.answer}`;
  }
  if (result.requiredCount > 1) {
    const have = result.matched.length;
    return `You gave ${have} of ${result.requiredCount}. One correct answer is: ${question.acceptableAnswers[0]}`;
  }
  return `Not correct. One correct answer is: ${question.acceptableAnswers[0]}`;
}
