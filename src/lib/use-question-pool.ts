/**
 * Shared question pool for the study modes (Flashcards, Quiz, …).
 *
 * Loads the live /api/questions feed and — when the user set a state during
 * onboarding — the runtime-generated /api/personalized-questions (governor,
 * senators, representative, capital), fetched in parallel and appended to the
 * pool. Failure handling is graceful by design:
 *   - personalized fetch fails → regular questions only
 *   - regular fetch fails      → the 10 offline mock questions (offline: true)
 * so screens never dead-end on a spinner or error wall.
 */

import { useCallback, useEffect, useState } from 'react';

import { MOCK_QUESTIONS } from '@/constants/mock-questions';
import { fetchPersonalizedQuestions, fetchQuestions, type Question } from '@/lib/api';
import { useOnboarding } from '@/lib/onboarding-context';

/**
 * Generic state-specific questions ("Who is the governor of your state now?"
 * etc.) that personalized questions REPLACE — mirrors the website's
 * STATE_SPECIFIC_IDS in lib/useQuestionPool.ts. Only removed when the
 * personalized fetch actually succeeds, so a failure can never leave the
 * pool at 124 with no state questions at all.
 */
const STATE_SPECIFIC_IDS = new Set(['g030', 'g035', 'g054', 'g055']);

export type QuestionPool =
  | { status: 'loading' }
  | { status: 'ready'; questions: Question[]; offline: boolean };

export function useQuestionPool(): QuestionPool & { reload: () => void } {
  const { data } = useOnboarding();
  const [pool, setPool] = useState<QuestionPool>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  const stateCode = data.usStateCode;
  const district = data.district;

  useEffect(() => {
    const controller = new AbortController();
    setPool({ status: 'loading' });

    // An unreachable host can leave fetch dangling for minutes on device —
    // abort after a few seconds so the offline fallback kicks in promptly.
    // `timedOut` distinguishes our abort (→ fallback) from unmount (→ nothing).
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 6000);

    const personalizedPromise = stateCode
      ? fetchPersonalizedQuestions({
          state: stateCode,
          district: district ?? undefined,
          signal: controller.signal,
        }).catch(() => [] as Question[]) // degrade to regular-only
      : Promise.resolve([] as Question[]);

    // Official set only — the feed's ~23 "extra practice" questions are a
    // website feature and deliberately excluded from the app.
    Promise.all([
      fetchQuestions({ set: 'official', signal: controller.signal }),
      personalizedPromise,
    ])
      .then(([regular, personalized]) => {
        if (regular.length === 0) throw new Error('Empty question feed');
        // Personalized questions replace their generic counterparts — but only
        // when we actually got them. No state / failed fetch / empty result →
        // the generic versions stay (matches the website: 128 untouched).
        const base =
          personalized.length > 0
            ? regular.filter((q) => !STATE_SPECIFIC_IDS.has(q.id))
            : regular;
        setPool({ status: 'ready', questions: [...base, ...personalized], offline: false });
      })
      .catch(() => {
        if (controller.signal.aborted && !timedOut) return; // unmounted
        setPool({ status: 'ready', questions: MOCK_QUESTIONS, offline: true });
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [reloadKey, stateCode, district]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return { ...pool, reload };
}
