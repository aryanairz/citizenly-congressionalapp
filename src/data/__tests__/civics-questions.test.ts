import {
  CIVICS_2025,
  INTERVIEW_POOLS,
  QUESTION_BY_ID,
  REDUCED_2025_IDS,
  STATE_DEPENDENT_2025_IDS,
  isServerQuestionId,
} from '@/data/civics-questions';

describe('bundled civics data', () => {
  it('has the official pool sizes for the current test', () => {
    expect(CIVICS_2025).toHaveLength(128);
    expect(REDUCED_2025_IDS).toHaveLength(20);
  });

  it('has unique ids', () => {
    const all = CIVICS_2025.map((q) => q.id);
    expect(new Set(all).size).toBe(all.length);
    expect(QUESTION_BY_ID.size).toBe(all.length);
  });

  it('the 65/20 subset only references questions that exist', () => {
    const ids = new Set(CIVICS_2025.map((q) => q.id));
    for (const id of REDUCED_2025_IDS) expect(ids.has(id)).toBe(true);
  });

  it('every question has a prompt and at least one answer, and sane requiredCount', () => {
    for (const q of CIVICS_2025) {
      expect(q.prompt.trim().length).toBeGreaterThan(0);
      expect(q.acceptableAnswers.length).toBeGreaterThan(0);
      for (const answer of q.acceptableAnswers) {
        expect(answer.trim().length).toBeGreaterThan(0);
      }
      if (q.requiredCount !== undefined) {
        expect(q.requiredCount).toBeGreaterThan(1);
        expect(q.requiredCount).toBeLessThanOrEqual(q.acceptableAnswers.length);
      }
    }
  });

  it('interview pools exclude state-dependent questions and stay large enough', () => {
    for (const id of STATE_DEPENDENT_2025_IDS) {
      expect(INTERVIEW_POOLS.pool2025).not.toContain(id);
      expect(INTERVIEW_POOLS.reduced2025).not.toContain(id);
    }
    // Must cover the maximum draw: 20 for the standard track, 10 for 65/20.
    expect(INTERVIEW_POOLS.pool2025.length).toBeGreaterThanOrEqual(20);
    expect(INTERVIEW_POOLS.reduced2025.length).toBeGreaterThanOrEqual(10);
  });

  it('no track can ever draw from an empty pool', () => {
    // The 2008 fields are required by QuestionPools; the legacy test is not
    // bundled, so they must still point at a usable bank.
    expect(INTERVIEW_POOLS.pool2008.length).toBeGreaterThanOrEqual(20);
    expect(INTERVIEW_POOLS.reduced2008.length).toBeGreaterThanOrEqual(10);
  });

  it('only ids in the bundled bank are server-recordable', () => {
    expect(isServerQuestionId('g001')).toBe(true);
    expect(isServerQuestionId('h010')).toBe(true);
    expect(isServerQuestionId('mock-1')).toBe(false);
    expect(isServerQuestionId('not-a-real-id')).toBe(false);
    for (const q of CIVICS_2025) expect(isServerQuestionId(q.id)).toBe(true);
  });

  it('state-dependent ids mirror the website exactly', () => {
    expect(STATE_DEPENDENT_2025_IDS).toEqual(['g030', 'g035', 'g054', 'g055']);
  });
});
