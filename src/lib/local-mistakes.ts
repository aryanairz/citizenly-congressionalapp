/**
 * The mistake bank — stored on the device, no server involved.
 *
 * Every study mode enrolls a question here when it's answered wrong, and
 * Review Mistakes removes it when it's finally answered right, so the bank
 * drains itself as the user improves. Nothing to manage, nothing to sync.
 *
 * Scoped per account id so two people sharing a phone don't mix their sets.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY_PREFIX = 'citizenly.mistakes.';

const keyFor = (userId: string) => `${KEY_PREFIX}${userId}`;

/** Notifies mounted screens (e.g. the dashboard badge) when the set changes. */
type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((fn) => fn());
}

export async function getMistakes(userId: string): Promise<string[]> {
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
    // Storage unavailable — the in-session UI still reflects the change.
  }
}

/** Record a wrong answer. Idempotent; never throws. */
export async function addMistake(userId: string, questionId: string): Promise<void> {
  const current = await getMistakes(userId);
  if (current.includes(questionId)) return;
  await write(userId, [...current, questionId]);
}

/** Remove one question — called when it's finally answered correctly. */
export async function removeMistake(userId: string, questionId: string): Promise<void> {
  const current = await getMistakes(userId);
  if (!current.includes(questionId)) return;
  await write(
    userId,
    current.filter((id) => id !== questionId),
  );
}

/** Empty the bank. */
export async function clearMistakes(userId: string): Promise<void> {
  await write(userId, []);
}

/**
 * Live view of the mistake set for a user. Re-reads whenever any screen
 * changes the bank, so the dashboard badge and the review screen agree.
 */
export function useMistakes(userId: string | null | undefined): {
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
    void getMistakes(userId).then((next) => {
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
