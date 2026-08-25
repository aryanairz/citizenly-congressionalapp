import {
  buildQueue,
  civicsConfig,
  civicsProgress,
  createInterview,
  currentQuestionId,
  determineRouting,
  reduce,
  retakePortions,
  summarize,
  TEST_2025_CUTOFF,
  type ApplicantProfile,
  type InterviewState,
  type QuestionPools,
} from '@/lib/interview-machine';

const pools: QuestionPools = {
  pool2008: Array.from({ length: 100 }, (_, i) => `q08-${i + 1}`),
  pool2025: Array.from({ length: 128 }, (_, i) => `q25-${i + 1}`),
  reduced2008: Array.from({ length: 20 }, (_, i) => `q08-${i + 1}`),
  reduced2025: Array.from({ length: 20 }, (_, i) => `q25-${i + 1}`),
};

const profile = (overrides: Partial<ApplicantProfile> = {}): ApplicantProfile => ({
  ageYears: 40,
  lprYears: 8,
  n400FiledOn: '2026-03-14',
  preferredLanguage: 'en',
  ...overrides,
});

/** Drive a fresh interview through oath/eligibility/English to the civics phase. */
function toCivics(state: InterviewState): InterviewState {
  let s = reduce(state, { type: 'BEGIN' });
  s = reduce(s, { type: 'SWORN_IN' });
  s = reduce(s, { type: 'ELIGIBILITY_COMPLETE', understood: true });
  if (!s.routing.englishExempt) {
    s = reduce(s, { type: 'READING_ATTEMPT', passed: true });
    s = reduce(s, { type: 'WRITING_ATTEMPT', passed: true });
  }
  expect(s.phase).toBe('civics');
  return s;
}

describe('determineRouting', () => {
  it('routes by N-400 filing date against the 2025-10-20 cutoff', () => {
    expect(determineRouting(profile({ n400FiledOn: '2025-10-19' })).testVersion).toBe('2008');
    expect(determineRouting(profile({ n400FiledOn: TEST_2025_CUTOFF })).testVersion).toBe('2025');
    expect(determineRouting(profile({ n400FiledOn: '2026-01-01' })).testVersion).toBe('2025');
  });

  it('grants English exemptions for 50/20, 55/15 and 65/20', () => {
    expect(determineRouting(profile()).englishExempt).toBe(false);
    expect(determineRouting(profile({ ageYears: 50, lprYears: 20 })).englishExempt).toBe(true);
    expect(determineRouting(profile({ ageYears: 55, lprYears: 15 })).englishExempt).toBe(true);
    expect(determineRouting(profile({ ageYears: 65, lprYears: 20 })).civicsTrack).toBe('reduced_65_20');
    expect(determineRouting(profile({ ageYears: 64, lprYears: 30 })).civicsTrack).toBe('standard');
  });
});

describe('civicsConfig', () => {
  it('2025 standard: 20 max, 12 to pass, out at 9 wrong', () => {
    const config = civicsConfig(determineRouting(profile()));
    expect(config).toMatchObject({ maxQuestions: 20, requiredCorrect: 12, failAtIncorrect: 9 });
  });

  it('2008 and 65/20 tracks: 10 max, 6 to pass, out at 5 wrong', () => {
    const c2008 = civicsConfig(determineRouting(profile({ n400FiledOn: '2024-01-01' })));
    expect(c2008).toMatchObject({ maxQuestions: 10, requiredCorrect: 6, failAtIncorrect: 5 });
    const reduced = civicsConfig(determineRouting(profile({ ageYears: 70, lprYears: 25 })));
    expect(reduced).toMatchObject({ maxQuestions: 10, requiredCorrect: 6, failAtIncorrect: 5 });
  });
});

describe('the officer stops the moment the outcome is decided (2025 track)', () => {
  it('stops at exactly 12 correct answers and passes', () => {
    let s = toCivics(createInterview(profile(), pools, 1));
    for (let i = 0; i < 11; i += 1) {
      s = reduce(s, { type: 'CIVICS_ANSWER', correct: true });
      expect(s.phase).toBe('civics');
      expect(s.civics.outcome).toBe('pending');
    }
    s = reduce(s, { type: 'CIVICS_ANSWER', correct: true });
    expect(s.phase).toBe('result');
    expect(s.civics.outcome).toBe('passed');
    expect(s.outcome).toBe('passed');
    expect(s.civics.history).toHaveLength(12); // not one question more
    // Further answers are ignored — the interview is over.
    const after = reduce(s, { type: 'CIVICS_ANSWER', correct: false });
    expect(after.civics.history).toHaveLength(12);
  });

  it('stops at exactly 9 incorrect answers and fails', () => {
    let s = toCivics(createInterview(profile(), pools, 2));
    for (let i = 0; i < 8; i += 1) {
      s = reduce(s, { type: 'CIVICS_ANSWER', correct: false });
      expect(s.phase).toBe('civics');
      expect(s.civics.outcome).toBe('pending');
    }
    s = reduce(s, { type: 'CIVICS_ANSWER', correct: false });
    expect(s.phase).toBe('result');
    expect(s.civics.outcome).toBe('failed');
    expect(s.outcome).toBe('failed');
    expect(s.civics.history).toHaveLength(9);
    expect(summarize(s).missedQuestionIds).toHaveLength(9);
  });

  it('a mixed session still ends exactly on the deciding answer', () => {
    let s = toCivics(createInterview(profile(), pools, 3));
    // 12 correct answers interleaved with 3 wrong ones — the 15th answer is
    // the 12th correct and must be the one that ends the test.
    const answers = [true, false, true, true, false, true, true, true, false, true, true, true, true, true, true];
    for (const correct of answers.slice(0, -1)) {
      s = reduce(s, { type: 'CIVICS_ANSWER', correct });
      expect(s.phase).toBe('civics');
    }
    s = reduce(s, { type: 'CIVICS_ANSWER', correct: answers[answers.length - 1] });
    expect(s.civics.correct).toBe(12);
    expect(s.phase).toBe('result');
    expect(s.outcome).toBe('passed');
  });
});

describe('2008 track stop rules', () => {
  it('passes at 6 correct, fails at 5 incorrect', () => {
    let pass = toCivics(createInterview(profile({ n400FiledOn: '2024-06-01' }), pools, 4));
    for (let i = 0; i < 6; i += 1) pass = reduce(pass, { type: 'CIVICS_ANSWER', correct: true });
    expect(pass.phase).toBe('result');
    expect(pass.outcome).toBe('passed');
    expect(pass.civics.history).toHaveLength(6);

    let fail = toCivics(createInterview(profile({ n400FiledOn: '2024-06-01' }), pools, 5));
    for (let i = 0; i < 5; i += 1) fail = reduce(fail, { type: 'CIVICS_ANSWER', correct: false });
    expect(fail.phase).toBe('result');
    expect(fail.outcome).toBe('failed');
  });
});

describe('English portions', () => {
  it('reading and writing are one-of-three, passed on first success', () => {
    let s = reduce(createInterview(profile(), pools, 6), { type: 'BEGIN' });
    s = reduce(s, { type: 'SWORN_IN' });
    s = reduce(s, { type: 'ELIGIBILITY_COMPLETE', understood: true });
    expect(s.phase).toBe('reading');
    s = reduce(s, { type: 'READING_ATTEMPT', passed: false });
    expect(s.phase).toBe('reading');
    s = reduce(s, { type: 'READING_ATTEMPT', passed: true });
    expect(s.phase).toBe('writing');
    expect(s.reading).toEqual({ attempts: 2, passed: true });
  });

  it('three failed attempts fail the portion but the interview continues', () => {
    let s = reduce(createInterview(profile(), pools, 7), { type: 'BEGIN' });
    s = reduce(s, { type: 'SWORN_IN' });
    s = reduce(s, { type: 'ELIGIBILITY_COMPLETE', understood: true });
    for (let i = 0; i < 3; i += 1) s = reduce(s, { type: 'READING_ATTEMPT', passed: false });
    expect(s.reading.passed).toBe(false);
    expect(s.phase).toBe('writing');
    s = reduce(s, { type: 'WRITING_ATTEMPT', passed: true });
    // Civics still passes on its own, but the overall outcome is failed and
    // only English is retaken.
    for (let i = 0; i < 12; i += 1) s = reduce(s, { type: 'CIVICS_ANSWER', correct: true });
    expect(s.civics.outcome).toBe('passed');
    expect(s.outcome).toBe('failed');
    expect(retakePortions(s)).toEqual(['english']);
  });

  it('English-exempt applicants go straight from eligibility to civics', () => {
    let s = reduce(createInterview(profile({ ageYears: 68, lprYears: 22 }), pools, 8), { type: 'BEGIN' });
    s = reduce(s, { type: 'SWORN_IN' });
    s = reduce(s, { type: 'ELIGIBILITY_COMPLETE', understood: true });
    expect(s.phase).toBe('civics');
    // Reduced track draws from the 65/20 subset.
    expect(pools.reduced2025).toContain(currentQuestionId(s));
  });
});

describe('queue building', () => {
  it('is deterministic for a fixed seed (demo recordings)', () => {
    const config = civicsConfig(determineRouting(profile()));
    expect(buildQueue(config, pools, 42)).toEqual(buildQueue(config, pools, 42));
    expect(buildQueue(config, pools, 42)).not.toEqual(buildQueue(config, pools, 43));
  });

  it('draws maxQuestions unique ids', () => {
    const config = civicsConfig(determineRouting(profile()));
    const queue = buildQueue(config, pools, 42);
    expect(queue).toHaveLength(config.maxQuestions);
    expect(new Set(queue).size).toBe(queue.length);
  });

  it('miss-count weighting keeps the queue unique and full-length', () => {
    const config = civicsConfig(determineRouting(profile()));
    const queue = buildQueue(config, pools, 42, { 'q25-7': 4, 'q25-9': 2 });
    expect(queue).toHaveLength(config.maxQuestions);
    expect(new Set(queue).size).toBe(queue.length);
  });
});

describe('odds and ends', () => {
  it('REQUEST_REPEAT is counted but never scored', () => {
    let s = toCivics(createInterview(profile(), pools, 9));
    s = reduce(s, { type: 'REQUEST_REPEAT' });
    s = reduce(s, { type: 'REQUEST_REPEAT' });
    expect(s.repeatRequests).toBe(2);
    expect(s.civics.correct).toBe(0);
    expect(s.civics.incorrect).toBe(0);
  });

  it('civicsProgress frames distance to pass, not a raw score', () => {
    let s = toCivics(createInterview(profile(), pools, 10));
    expect(civicsProgress(s).label).toBe('12 more correct to pass');
    s = reduce(s, { type: 'CIVICS_ANSWER', correct: true });
    expect(civicsProgress(s).label).toBe('11 more correct to pass');
  });

  it('ABORT ends in a failed result', () => {
    let s = toCivics(createInterview(profile(), pools, 11));
    s = reduce(s, { type: 'ABORT' });
    expect(s.phase).toBe('result');
    expect(s.outcome).toBe('failed');
  });

  it('summarize reports the missed question ids in asked order', () => {
    let s = toCivics(createInterview(profile(), pools, 12));
    const first = currentQuestionId(s)!;
    s = reduce(s, { type: 'CIVICS_ANSWER', correct: false });
    const second = currentQuestionId(s)!;
    s = reduce(s, { type: 'CIVICS_ANSWER', correct: true });
    s = reduce(s, { type: 'ABORT' });
    expect(summarize(s).missedQuestionIds).toEqual([first]);
    expect(summarize(s).missedQuestionIds).not.toContain(second);
  });
});
