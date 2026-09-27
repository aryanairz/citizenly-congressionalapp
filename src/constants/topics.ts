/**
 * Topic taxonomy for browsing/practicing questions. Keys map to the feed's
 * `topic` field, except:
 *  - 'all'   → no filter
 *  - 'state' → the personalized questions (governor/senators/rep/capital),
 *              which carry topic "government" in the feed but are generated
 *              per-user with ids like p_gov_CA - so they're matched by id.
 */

import type { Question } from '@/data/question-types';

export type TopicKey = 'all' | 'government' | 'rights' | 'history' | 'symbols' | 'state';

export const TOPIC_OPTIONS: { key: TopicKey; label: string }[] = [
  { key: 'all', label: 'All Topics' },
  { key: 'government', label: 'Government' },
  { key: 'rights', label: 'Rights & Responsibilities' },
  { key: 'history', label: 'American History' },
  { key: 'symbols', label: 'Symbols & Holidays' },
  { key: 'state', label: 'Your State & Officials' },
];

/** Personalized questions are generated per-user (ids p_gov_CA, p_rep_TX_12, …). */
export function isPersonalized(question: Question): boolean {
  return question.id.startsWith('p_');
}

export function filterByTopic(questions: Question[], topic: TopicKey): Question[] {
  switch (topic) {
    case 'all':
      return questions;
    case 'state':
      return questions.filter(isPersonalized);
    default:
      return questions.filter((q) => q.topic === topic && !isPersonalized(q));
  }
}

export function topicLabel(topic: TopicKey): string {
  return TOPIC_OPTIONS.find((option) => option.key === topic)?.label ?? 'All Topics';
}

/** Parse a router param into a TopicKey, defaulting to 'all'. */
export function parseTopicKey(value: string | string[] | undefined): TopicKey {
  const raw = Array.isArray(value) ? value[0] : value;
  return TOPIC_OPTIONS.some((option) => option.key === raw) ? (raw as TopicKey) : 'all';
}
