/**
 * Offline-safe mistake recording. Writes go to a local queue FIRST (so nothing
 * is ever dropped silently), then flush to POST /api/mistakes in the
 * background. Failed sends stay queued and retry on the next trigger:
 *   - every new recordMistake() call
 *   - sign-in / session restore
 *   - app returning to the foreground
 *
 * The queue is scoped per user id so a queued mistake from one account can
 * never be flushed into another account's set. The server add is idempotent,
 * so a crash between send and dequeue at worst re-sends a no-op.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiAddMistake } from '@/lib/api';

const QUEUE_KEY_PREFIX = 'citizenly.mistakeQueue.';

const keyFor = (userId: string) => `${QUEUE_KEY_PREFIX}${userId}`;

// One flush at a time; concurrent triggers are common (record + foreground).
let flushing = false;

async function readQueue(userId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

async function writeQueue(userId: string, ids: string[]): Promise<void> {
  try {
    if (ids.length === 0) {
      await AsyncStorage.removeItem(keyFor(userId));
    } else {
      await AsyncStorage.setItem(keyFor(userId), JSON.stringify(ids));
    }
  } catch {
    // Storage unavailable — nothing more we can do locally.
  }
}

/**
 * Record a wrong answer. Queue-first, then background flush. Never throws,
 * never blocks the caller.
 */
export function recordMistake(userId: string, token: string, questionId: string): void {
  void (async () => {
    const queue = await readQueue(userId);
    if (!queue.includes(questionId)) {
      queue.push(questionId);
      await writeQueue(userId, queue);
    }
    await flushMistakeQueue(userId, token);
  })().catch(() => {});
}

/**
 * Drop a user's local queue (used at logout, after a best-effort flush, so a
 * shared device doesn't carry another person's pending writes).
 */
export async function clearMistakeQueue(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(keyFor(userId));
  } catch {
    // Storage unavailable — nothing else to do.
  }
}

/** Send everything queued for this user; stops (and keeps the rest) on failure. */
export async function flushMistakeQueue(userId: string, token: string): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    let queue = await readQueue(userId);
    while (queue.length > 0) {
      // Sequential on purpose: one failure aborts the pass, remainder stays
      // queued for the next trigger.
      await apiAddMistake(queue[0], token);
      queue = queue.slice(1);
      await writeQueue(userId, queue);
    }
  } catch {
    // Offline or server unreachable — retry on the next trigger.
  } finally {
    flushing = false;
  }
}
