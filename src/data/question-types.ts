/**
 * Types for the bundled civics content.
 *
 * These mirror the Citizenly website's `data/questions.ts` shapes exactly, so
 * the bundled bank and the personalized-question generator port across
 * unchanged. `Lang` is the app's own 48-code union (src/constants/brand.ts) —
 * the two lists are identical and must stay that way.
 */

import type { LanguageCode } from '@/constants/brand';

export type Lang = LanguageCode;

/**
 * A string localized into the supported languages. Only `en`, `ml` and `gu`
 * are required by the type; in the bundled data every language is present on
 * every field, but callers should still go through `localize()` so a future
 * addition can't crash a screen.
 */
export type LocalizedText = { en: string; ml: string; gu: string } & Partial<
  Record<Lang, string>
>;

/** Alias kept so files ported from the website compile unchanged. */
export type BilingualText = LocalizedText;

export type Topic = 'government' | 'rights' | 'history' | 'symbols' | 'extra';

export interface Question {
  id: string;
  topic: string;
  /** The prompt, localized. */
  question: LocalizedText;
  /** Answer choices; each choice is localized. */
  options: LocalizedText[];
  /** Index into `options` of the single correct answer. */
  correctIndex: number;
  /** For multi-select questions, all correct indices into `options`. */
  correctIndices?: number[];
  /** Why the answer is correct, localized. */
  explanation: LocalizedText;
  /** True for the 20 questions in the USCIS 65/20 reduced study set. */
  is6520?: boolean;
}
