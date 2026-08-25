/**
 * interview-machine.ts
 *
 * Pure state machine for a simulated naturalization interview.
 *
 * Encodes the real USCIS rules rather than a generic quiz:
 *   - Which civics test applies is decided by N-400 filing date, not age.
 *     Filed on or after 2025-10-20 -> the 2025 test (128-question pool,
 *     up to 20 asked, 12 to pass). Filed before -> the 2008 test
 *     (100-question pool, up to 10 asked, 6 to pass).
 *   - The officer STOPS as soon as the outcome is decided: at 12 correct or
 *     9 incorrect on the 2025 test. Sessions are therefore short and variable
 *     in length, which is both accurate and much better to sit through.
 *   - Reading and writing are each one-of-three, passed on the first success.
 *   - 50/20 and 55/15 applicants are exempt from English entirely and take
 *     civics in their own language. 65/20 applicants additionally study a
 *     reduced pool and answer 10 questions, needing 6.
 *
 * No React, no native calls, no I/O. Reducer in, reducer out.
 */

// ---------------------------------------------------------------------------
// Applicant routing
// ---------------------------------------------------------------------------

export type TestVersion = "2008" | "2025";
export type CivicsTrack = "standard" | "reduced_65_20";

/** The date the 2025 civics test took effect, by N-400 filing date. */
export const TEST_2025_CUTOFF = "2025-10-20";

export interface ApplicantProfile {
  ageYears: number;
  /** Years held as a lawful permanent resident. */
  lprYears: number;
  /** ISO date the N-400 was filed, e.g. "2026-03-14". */
  n400FiledOn: string;
  /** BCP-47 tag for the language civics is taken in when English-exempt. */
  preferredLanguage: string;
}

export interface Routing {
  testVersion: TestVersion;
  civicsTrack: CivicsTrack;
  /** Exempt from reading, writing and the English speaking assessment. */
  englishExempt: boolean;
  /** Human-readable basis, shown on the onboarding confirmation screen. */
  rationale: string;
}

export function determineRouting(profile: ApplicantProfile): Routing {
  const testVersion: TestVersion =
    profile.n400FiledOn >= TEST_2025_CUTOFF ? "2025" : "2008";

  const is65_20 = profile.ageYears >= 65 && profile.lprYears >= 20;
  const is50_20 = profile.ageYears >= 50 && profile.lprYears >= 20;
  const is55_15 = profile.ageYears >= 55 && profile.lprYears >= 15;

  const englishExempt = is65_20 || is50_20 || is55_15;

  let rationale: string;
  if (is65_20) {
    rationale =
      "Age 65 or older with 20 years as a permanent resident: a reduced set of " +
      "civics questions, taken in your own language.";
  } else if (is50_20) {
    rationale =
      "Age 50 or older with 20 years as a permanent resident: no English test. " +
      "Civics is taken in your own language.";
  } else if (is55_15) {
    rationale =
      "Age 55 or older with 15 years as a permanent resident: no English test. " +
      "Civics is taken in your own language.";
  } else {
    rationale = "Full English and civics test.";
  }

  return {
    testVersion,
    civicsTrack: is65_20 ? "reduced_65_20" : "standard",
    englishExempt,
    rationale,
  };
}

// ---------------------------------------------------------------------------
// Civics scoring configuration
// ---------------------------------------------------------------------------

export interface CivicsConfig {
  testVersion: TestVersion;
  track: CivicsTrack;
  /** Maximum questions the officer will ask. */
  maxQuestions: number;
  /** Correct answers needed to pass. */
  requiredCorrect: number;
  /** Incorrect answers at which the test is over. */
  failAtIncorrect: number;
}

export function civicsConfig(routing: Routing): CivicsConfig {
  const reduced = routing.civicsTrack === "reduced_65_20";
  const standard2025 = routing.testVersion === "2025" && !reduced;

  const maxQuestions = standard2025 ? 20 : 10;
  const requiredCorrect = standard2025 ? 12 : 6;

  return {
    testVersion: routing.testVersion,
    track: routing.civicsTrack,
    maxQuestions,
    requiredCorrect,
    // Once this many are wrong, passing is arithmetically impossible.
    failAtIncorrect: maxQuestions - requiredCorrect + 1,
  };
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export type Phase =
  | "idle"
  | "oath" // right hand raised, sworn in
  | "eligibility" // N-400 walkthrough; this is where speaking is judged
  | "reading"
  | "writing"
  | "civics"
  | "result";

export type Outcome = "pending" | "passed" | "failed";

export interface OneOfThreeState {
  /** Sentence indices offered so far, 0..2. */
  attempts: number;
  passed: boolean | null;
}

export interface CivicsState {
  /** Question ids in the order they will be asked. */
  queue: string[];
  /** Index into `queue` of the question awaiting an answer. */
  cursor: number;
  correct: number;
  incorrect: number;
  /** Per-question record, in the order asked. */
  history: Array<{ questionId: string; correct: boolean }>;
  outcome: Outcome;
}

export interface InterviewState {
  phase: Phase;
  profile: ApplicantProfile;
  routing: Routing;
  config: CivicsConfig;
  /**
   * Whether the officer could conduct the eligibility review in English.
   * This is the entire speaking test: it fails only when the applicant cannot
   * understand enough English to be sworn in or answer N-400 questions.
   */
  speakingUnderstood: boolean | null;
  reading: OneOfThreeState;
  writing: OneOfThreeState;
  civics: CivicsState;
  /** Times the applicant asked the officer to repeat. Not scored. */
  repeatRequests: number;
  outcome: Outcome;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type InterviewEvent =
  | { type: "BEGIN" }
  | { type: "SWORN_IN" }
  | { type: "ELIGIBILITY_COMPLETE"; understood: boolean }
  | { type: "READING_ATTEMPT"; passed: boolean }
  | { type: "WRITING_ATTEMPT"; passed: boolean }
  | { type: "CIVICS_ANSWER"; correct: boolean }
  | { type: "REQUEST_REPEAT" }
  | { type: "ABORT" };

// ---------------------------------------------------------------------------
// Question selection
// ---------------------------------------------------------------------------

/** Deterministic PRNG. Pass a fixed seed to reproduce a session for a demo. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface QuestionPools {
  /** Question ids in the 2008 pool of 100. */
  pool2008: string[];
  /** Question ids in the 2025 pool of 128. */
  pool2025: string[];
  /** The 20-question subset marked for 65/20 applicants, per test version. */
  reduced2008: string[];
  reduced2025: string[];
}

/**
 * Weights are optional. Supply per-question miss counts from the user's own
 * history and questions they get wrong will surface more often in practice
 * sessions. Pass nothing for a true random draw, which is what a real
 * interview is.
 */
export function buildQueue(
  config: CivicsConfig,
  pools: QuestionPools,
  seed: number,
  missCounts?: Record<string, number>,
): string[] {
  const reduced = config.track === "reduced_65_20";
  const source = reduced
    ? config.testVersion === "2025"
      ? pools.reduced2025
      : pools.reduced2008
    : config.testVersion === "2025"
      ? pools.pool2025
      : pools.pool2008;

  const rng = mulberry32(seed);

  if (!missCounts) {
    return shuffle(source, rng).slice(0, config.maxQuestions);
  }

  // Leitner-ish weighting: a question missed n times is drawn as though it
  // appeared n + 1 times in the pool.
  const weighted: string[] = [];
  for (const id of source) {
    const repeats = 1 + Math.min(missCounts[id] ?? 0, 4);
    for (let i = 0; i < repeats; i += 1) weighted.push(id);
  }

  const picked: string[] = [];
  const seen = new Set<string>();
  for (const id of shuffle(weighted, rng)) {
    if (seen.has(id)) continue;
    seen.add(id);
    picked.push(id);
    if (picked.length === config.maxQuestions) break;
  }
  return picked;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function createInterview(
  profile: ApplicantProfile,
  pools: QuestionPools,
  seed: number = Date.now(),
  missCounts?: Record<string, number>,
): InterviewState {
  const routing = determineRouting(profile);
  const config = civicsConfig(routing);

  return {
    phase: "idle",
    profile,
    routing,
    config,
    speakingUnderstood: null,
    reading: { attempts: 0, passed: null },
    writing: { attempts: 0, passed: null },
    civics: {
      queue: buildQueue(config, pools, seed, missCounts),
      cursor: 0,
      correct: 0,
      incorrect: 0,
      history: [],
      outcome: "pending",
    },
    repeatRequests: 0,
    outcome: "pending",
  };
}

export function reduce(
  state: InterviewState,
  event: InterviewEvent,
): InterviewState {
  switch (event.type) {
    case "BEGIN":
      if (state.phase !== "idle") return state;
      return { ...state, phase: "oath" };

    case "SWORN_IN":
      if (state.phase !== "oath") return state;
      return { ...state, phase: "eligibility" };

    case "ELIGIBILITY_COMPLETE": {
      if (state.phase !== "eligibility") return state;
      // The speaking test is only failed when English comprehension is
      // insufficient to be sworn in or answer N-400 questions. Even then the
      // officer administers every remaining portion, so the interview
      // continues either way.
      const next = { ...state, speakingUnderstood: event.understood };
      return {
        ...next,
        phase: state.routing.englishExempt ? "civics" : "reading",
      };
    }

    case "READING_ATTEMPT": {
      if (state.phase !== "reading") return state;
      const attempts = state.reading.attempts + 1;
      const passed = event.passed ? true : attempts >= 3 ? false : null;
      const reading = { attempts, passed };
      return passed === null
        ? { ...state, reading }
        : { ...state, reading, phase: "writing" };
    }

    case "WRITING_ATTEMPT": {
      if (state.phase !== "writing") return state;
      const attempts = state.writing.attempts + 1;
      const passed = event.passed ? true : attempts >= 3 ? false : null;
      const writing = { attempts, passed };
      return passed === null
        ? { ...state, writing }
        : { ...state, writing, phase: "civics" };
    }

    case "CIVICS_ANSWER": {
      if (state.phase !== "civics" || state.civics.outcome !== "pending")
        return state;

      const questionId = state.civics.queue[state.civics.cursor];
      if (questionId === undefined) return state;

      const correct = state.civics.correct + (event.correct ? 1 : 0);
      const incorrect = state.civics.incorrect + (event.correct ? 0 : 1);

      let outcome: Outcome = "pending";
      if (correct >= state.config.requiredCorrect) outcome = "passed";
      else if (incorrect >= state.config.failAtIncorrect) outcome = "failed";

      const civics: CivicsState = {
        ...state.civics,
        cursor: state.civics.cursor + 1,
        correct,
        incorrect,
        history: [
          ...state.civics.history,
          { questionId, correct: event.correct },
        ],
        outcome,
      };

      if (outcome === "pending") return { ...state, civics };
      return finalize({ ...state, civics });
    }

    case "REQUEST_REPEAT":
      return { ...state, repeatRequests: state.repeatRequests + 1 };

    case "ABORT":
      return { ...state, phase: "result", outcome: "failed" };

    default:
      return state;
  }
}

function finalize(state: InterviewState): InterviewState {
  const englishOk = state.routing.englishExempt
    ? true
    : state.reading.passed === true &&
      state.writing.passed === true &&
      state.speakingUnderstood === true;

  const outcome: Outcome =
    state.civics.outcome === "passed" && englishOk ? "passed" : "failed";

  return { ...state, phase: "result", outcome };
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Id of the civics question awaiting an answer, or null. */
export function currentQuestionId(state: InterviewState): string | null {
  if (state.phase !== "civics" || state.civics.outcome !== "pending")
    return null;
  return state.civics.queue[state.civics.cursor] ?? null;
}

/**
 * Progress copy for the civics phase. Deliberately frames the remaining
 * distance rather than the running score -- "3 more to pass" is a better
 * thing to read mid-test than "9 correct, 5 wrong".
 */
export function civicsProgress(state: InterviewState): {
  asked: number;
  toPass: number;
  toFail: number;
  label: string;
} {
  const asked = state.civics.history.length;
  const toPass = Math.max(
    0,
    state.config.requiredCorrect - state.civics.correct,
  );
  const toFail = Math.max(
    0,
    state.config.failAtIncorrect - state.civics.incorrect,
  );
  return {
    asked,
    toPass,
    toFail,
    label: toPass === 0 ? "Passed" : `${toPass} more correct to pass`,
  };
}

/** Which portions a failed applicant would retake at the re-examination. */
export function retakePortions(
  state: InterviewState,
): Array<"english" | "civics"> {
  if (state.outcome !== "failed") return [];
  const portions: Array<"english" | "civics"> = [];
  const englishFailed =
    !state.routing.englishExempt &&
    (state.reading.passed === false ||
      state.writing.passed === false ||
      state.speakingUnderstood === false);
  if (englishFailed) portions.push("english");
  if (state.civics.outcome === "failed") portions.push("civics");
  return portions;
}

/** Summary object for the result screen and for the offline results queue. */
export function summarize(state: InterviewState) {
  return {
    outcome: state.outcome,
    testVersion: state.config.testVersion,
    track: state.config.track,
    englishExempt: state.routing.englishExempt,
    civics: {
      asked: state.civics.history.length,
      correct: state.civics.correct,
      incorrect: state.civics.incorrect,
      required: state.config.requiredCorrect,
    },
    reading: state.reading.passed,
    writing: state.writing.passed,
    speakingUnderstood: state.speakingUnderstood,
    repeatRequests: state.repeatRequests,
    missedQuestionIds: state.civics.history
      .filter((h) => !h.correct)
      .map((h) => h.questionId),
    retake: retakePortions(state),
  };
}
