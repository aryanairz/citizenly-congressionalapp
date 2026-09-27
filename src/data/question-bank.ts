/**
 * The bundled civics question bank - the app's only source of study content.
 *
 * The 128 official USCIS questions, every field translated into all 48
 * supported languages, shipped inside the app. Nothing here touches the
 * network: the app works completely offline, on a plane, with no account.
 *
 * The website's 23 "extra practice" records are deliberately NOT bundled -
 * they carry no standing on the real test, and including them would make the
 * app's "128 questions" claim untrue.
 *
 * Generated from the Citizenly website's `data/questions.ts` by executing that
 * module (29 of its 48 languages are applied by merge loops at load time, so
 * the source file cannot be copied directly) and serializing the merged result.
 */

import raw from '@/data/questions.json';
import { getPersonalizedQuestions } from '@/data/personalized-questions';
import type { Question } from '@/data/question-types';

export type { Question, LocalizedText, Lang, Topic } from '@/data/question-types';

/** The 128 official USCIS civics questions. */
export const OFFICIAL_QUESTIONS = raw as unknown as Question[];

/** How many questions the study material covers - shown on the dashboard. */
export const TOTAL_OFFICIAL = OFFICIAL_QUESTIONS.length;

/** The 20 questions USCIS designates for 65/20 special consideration. */
export const REDUCED_6520_QUESTIONS = OFFICIAL_QUESTIONS.filter((q) => q.is6520 === true);

/**
 * Generic state-specific questions that personalized ones replace - mirrors
 * the website's STATE_SPECIFIC_IDS. Kept in the bank so a user with no state
 * set still sees a governor/senator/capital question.
 */
const STATE_SPECIFIC_IDS = new Set(['g030', 'g035', 'g054', 'g055']);

export const QUESTION_BY_ID: ReadonlyMap<string, Question> = new Map(
  OFFICIAL_QUESTIONS.map((q) => [q.id, q]),
);

export interface PoolOptions {
  /** Two-letter state/territory code, if the user set one. */
  stateCode?: string | null;
  /** Congressional district number, if the user set one. */
  district?: number | null;
  /** True when the user claimed the 65/20 exemption. */
  reduced6520?: boolean;
}

/**
 * Builds the study pool.
 *
 * 65/20 users get exactly 20 questions instead of 128 - the single biggest
 * lever in the product. Everyone else gets the official 128.
 *
 * Setting a state swaps the four generic state questions for real ones naming
 * the user's own officials. That's 4 out but 5 in (governor, both senators,
 * representative, capital), so a personalized pool is 129 rather than 128 -
 * the extra one is the second senator, which the generic bank asks about in a
 * single combined question.
 */
export function buildQuestionPool(options: PoolOptions = {}): Question[] {
  const { stateCode, district, reduced6520 = false } = options;

  const personalized = stateCode
    ? getPersonalizedQuestions(stateCode, district ?? undefined)
    : [];

  if (reduced6520) {
    // 19 fixed questions plus the governor one, which personalizes when we
    // know the user's state. Keeps the set at exactly 20 either way.
    const base = REDUCED_6520_QUESTIONS.filter((q) => !STATE_SPECIFIC_IDS.has(q.id));
    const governor = personalized.filter((q) => q.id.startsWith('p_gov_'));
    if (governor.length > 0) return [...base, ...governor];
    return [...base, ...REDUCED_6520_QUESTIONS.filter((q) => q.id === 'g054')];
  }

  if (personalized.length === 0) return OFFICIAL_QUESTIONS;

  return [
    ...OFFICIAL_QUESTIONS.filter((q) => !STATE_SPECIFIC_IDS.has(q.id)),
    ...personalized,
  ];
}
