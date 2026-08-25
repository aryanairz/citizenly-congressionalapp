/**
 * The study question pool, built from the bundled bank.
 *
 * There is no fetch, no loading state that can fail, and no offline fallback,
 * because the questions ship inside the app. The hook keeps its previous
 * shape so screens didn't need rewriting when the backend was removed.
 *
 * The pool reflects two onboarding choices: a 65/20 exemption reduces it from
 * 128 questions to the 20 USCIS designates, and a saved state swaps the
 * generic "who is your governor" questions for ones naming real officials.
 */

import { useMemo } from 'react';

import { buildQuestionPool, type Question } from '@/data/question-bank';
import { useOnboarding } from '@/lib/onboarding-context';

export type QuestionPool = { status: 'ready'; questions: Question[] };

export function useQuestionPool(): QuestionPool {
  const { data } = useOnboarding();

  const stateCode = data.usStateCode;
  const district = data.district;
  const reduced6520 = data.exemption === '65/20';

  const questions = useMemo(
    () => buildQuestionPool({ stateCode, district, reduced6520 }),
    [stateCode, district, reduced6520],
  );

  return { status: 'ready', questions };
}
