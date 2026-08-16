/**
 * Helpers for reading localized content off the shared backend.
 *
 * Only `en`, `ml`, and `gu` are guaranteed present on a `LocalizedText` (see
 * lib/api.ts); the other 8 languages may be missing for a given question. Use
 * `localize` so a missing translation transparently falls back to English.
 */

import type { LanguageCode } from '@/constants/brand';
import type { LocalizedText, Question } from '@/lib/api';

/**
 * Return the string for `lang`, falling back to English when that language is
 * missing. English is always present, so the result is always a string.
 */
export function localize(text: LocalizedText, lang: LanguageCode): string {
  return text[lang] ?? text.en;
}

/** The localized correct answer(s) of a question, joined for display. */
export function correctAnswerText(question: Question, lang: LanguageCode): string {
  const indices = question.correctIndices?.length
    ? question.correctIndices
    : [question.correctIndex];
  return indices
    .map((i) => question.options[i])
    .filter(Boolean)
    .map((option) => localize(option, lang))
    .join(', ');
}
