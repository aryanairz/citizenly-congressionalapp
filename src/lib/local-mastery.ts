/**
 * The mastery set - stored on the device, no server involved.
 *
 * A question is mastered when it has been answered correctly, and stops being
 * mastered the moment it is answered wrong again.
 *
 * This set and the mistake bank are kept separate rather than merged, because
 * they drain differently: by design, a mistake only leaves the bank by being
 * answered correctly inside Review Mistakes, so answering it right in Quiz
 * adds it here while leaving it there. Anything that reports a count treats
 * the bank as the stronger signal and subtracts it, which is what makes
 * "mastered" mean "answered right and not wrong since" rather than "answered
 * right once, ever".
 *
 * Answering correctly once is the bar on purpose. The real civics test asks
 * up to 20 of the 128 and expects 12 right; demanding a streak before a
 * question counts would make the dashboard understate real readiness, and the
 * audience for this app needs to see that it is working.
 *
 * Scoped per account id so two people sharing a phone don't mix their sets.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY_PREFIX = 'citizenly.mastered.';

const keyFor = (userId: string) => `${KEY_PREFIX}${userId}`;

/** Notifies mounted screens (e.g. the dashboard figure) when the set changes. */
type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((fn) => fn());
}

export async function getMastered(userId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

async function write(userId: string, ids: string[]): Promise<void> {
  try {
    if (ids.length === 0) {
      await AsyncStorage.removeItem(keyFor(userId));
    } else {
      await AsyncStorage.setItem(keyFor(userId), JSON.stringify(ids));
    }
    notify();
  } catch {
    // Storage unavailable - the in-session UI still reflects the change.
  }
}

/** Record a correct answer. Idempotent; never throws. */
export async function addMastered(userId: string, questionId: string): Promise<void> {
  const current = await getMastered(userId);
  if (current.includes(questionId)) return;
  await write(userId, [...current, questionId]);
}

/** Drop one question - called when it's answered wrong again. */
export async function removeMastered(userId: string, questionId: string): Promise<void> {
  const current = await getMastered(userId);
  if (!current.includes(questionId)) return;
  await write(
    userId,
    current.filter((id) => id !== questionId),
  );
}

/** Empty the set. */
export async function clearMastered(userId: string): Promise<void> {
  await write(userId, []);
}

/**
 * Live view of the mastery set for a user. Re-reads whenever any screen
 * changes it, so the dashboard figure and the study screens agree.
 */
export function useMastery(userId: string | null | undefined): {
  ids: string[];
  loading: boolean;
  refresh: () => void;
} {
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!userId) {
      setIds([]);
      setLoading(false);
      return;
    }
    void getMastered(userId).then((next) => {
      setIds(next);
      setLoading(false);
    });
  }, [userId]);

  useEffect(() => {
    refresh();
    listeners.add(refresh);
    return () => {
      listeners.delete(refresh);
    };
  }, [refresh]);

  return { ids, loading, refresh };
}
