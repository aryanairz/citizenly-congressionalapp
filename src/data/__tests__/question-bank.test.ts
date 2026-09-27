import { LANGUAGE_CODES } from '@/constants/brand';
import {
  OFFICIAL_QUESTIONS,
  REDUCED_6520_QUESTIONS,
  TOTAL_OFFICIAL,
  buildQuestionPool,
} from '@/data/question-bank';

describe('bundled study bank', () => {
  it('ships exactly the 128 official questions', () => {
    expect(OFFICIAL_QUESTIONS).toHaveLength(128);
    expect(TOTAL_OFFICIAL).toBe(128);
    expect(REDUCED_6520_QUESTIONS).toHaveLength(20);
  });

  it("does not bundle the website's extra-practice set", () => {
    // Those 23 records have no standing on the real test; shipping them would
    // make every "128 questions" string in the UI a lie.
    expect(OFFICIAL_QUESTIONS.every((q) => q.topic !== 'extra')).toBe(true);
  });

  it('has unique ids and a valid correct answer', () => {
    const ids = OFFICIAL_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of OFFICIAL_QUESTIONS) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);
    }
  });

  it('is translated into every supported language, with no English fallbacks', () => {
    // The whole point of bundling: a user in any of the 48 languages can study
    // offline. A missing string here would silently show English instead.
    for (const q of OFFICIAL_QUESTIONS) {
      for (const field of [q.question, q.explanation, ...q.options]) {
        for (const code of LANGUAGE_CODES) {
          const value = (field as Record<string, unknown>)[code];
          expect(typeof value).toBe('string');
          expect((value as string).length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('buildQuestionPool', () => {
  it('defaults to the 128 official questions', () => {
    expect(buildQuestionPool()).toHaveLength(128);
  });

  it('gives 65/20 users exactly 20 questions', () => {
    expect(buildQuestionPool({ reduced6520: true })).toHaveLength(20);
    expect(buildQuestionPool({ reduced6520: true, stateCode: 'TX' })).toHaveLength(20);
  });

  it('swaps the generic state questions for real officials when a state is set', () => {
    const pool = buildQuestionPool({ stateCode: 'TX', district: 15 });
    const ids = pool.map((q) => q.id);
    // The four hardcoded Texas questions are gone…
    for (const generic of ['g030', 'g035', 'g054', 'g055']) {
      expect(ids).not.toContain(generic);
    }
    // …replaced by personalized ones naming the user's actual officials.
    expect(ids.some((id) => id.startsWith('p_gov_'))).toBe(true);
    // 4 generic out, 5 personalized in (governor, both senators, rep, capital)
    // - the generic bank asks about both senators in one combined question.
    expect(pool).toHaveLength(129);
  });

  it('keeps the generic state questions when no state is set', () => {
    const ids = buildQuestionPool().map((q) => q.id);
    expect(ids).toContain('g054');
  });

  it("handles D.C., which has no governor or senators", () => {
    const pool = buildQuestionPool({ stateCode: 'DC' });
    expect(pool.length).toBeGreaterThan(0);
  });
});
