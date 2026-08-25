/**
 * The bundled civics question bank for the mock USCIS interview.
 *
 * Everything here is local and hardcoded — this feature works fully offline
 * and never calls the /api/* routes.
 *
 * Only the CURRENT (2025) test is bundled: 128 questions, applying to N-400s
 * filed on or after 2025-10-20. Ids mirror the shared backend's official bank
 * (g###/h###/r###/s###), so a miss recorded here is a real server mistake and
 * shows up in Review Mistakes.
 *
 * The legacy 2008 test is deliberately NOT shipped — see README "Known gaps".
 * src/lib/interview-machine.ts still models the filing-date rule correctly, so
 * the pools below simply point every track at the current bank rather than
 * leaving an empty queue.
 */

import type { CivicsQuestion } from '@/lib/answer-matching';
import type { QuestionPools } from '@/lib/interview-machine';

import { OFFICIAL_QUESTIONS } from '@/data/question-bank';
import {
  CIVICS_2025,
  REDUCED_2025_IDS,
  STATE_DEPENDENT_2025_IDS,
} from '@/data/civics-2025';

/** Ids present in the study bank that Review Mistakes renders from. */
const STUDY_BANK_IDS = new Set(OFFICIAL_QUESTIONS.map((q) => q.id));

export { CIVICS_2025, REDUCED_2025_IDS, STATE_DEPENDENT_2025_IDS };

/** Every bundled question, addressable by id. */
export const QUESTION_BY_ID: ReadonlyMap<string, CivicsQuestion> = new Map(
  CIVICS_2025.map((q) => [q.id, q]),
);

const excluded = new Set(STATE_DEPENDENT_2025_IDS);
const dropStateDependent = (ids: string[]): string[] =>
  ids.filter((id) => !excluded.has(id));

/**
 * The pools handed to createInterview(). State-dependent questions (your
 * governor / senators / representative / state capital) are excluded: their
 * answers can't be verified offline, and asking a question the app can't
 * grade would be worse than not asking it.
 *
 * The 2008 fields are required by QuestionPools and point at the current
 * bank — the setup screen never routes anyone to that track.
 */
const pool2025 = dropStateDependent(CIVICS_2025.map((q) => q.id));
const reduced2025 = dropStateDependent(REDUCED_2025_IDS);

export const INTERVIEW_POOLS: QuestionPools = {
  pool2025,
  reduced2025,
  pool2008: pool2025,
  reduced2008: reduced2025,
};

/**
 * Whether an interview question also exists in the study bank.
 *
 * Interview misses go into the same mistake bank every other mode writes to,
 * and Review Mistakes renders them from the study bank — so an id that isn't
 * in there would show up as an invisible entry. The two banks share ids by
 * construction; this is the guard that keeps it that way.
 */
export function isServerQuestionId(id: string): boolean {
  return STUDY_BANK_IDS.has(id);
}
