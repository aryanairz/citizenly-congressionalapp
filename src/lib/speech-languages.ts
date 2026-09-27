/**
 * Which languages can be spoken, and what tag to ask the engine for.
 *
 * Kept free of expo-speech and React so it can be unit-tested directly - the
 * "hide the button" rule is the kind of thing that silently regresses when a
 * language is added, and a wrong answer here means either a dead button or a
 * Khmer sentence read aloud in an English voice.
 */

import type { LanguageCode } from '@/constants/brand';

/**
 * App language code -> BCP-47 tag for the speech engine.
 *
 * Most codes pass through unchanged; these are the ones where the app's code
 * is not a valid tag, or where a region is needed to pick the right voice
 * (Simplified vs Traditional Chinese, Brazilian vs European Portuguese).
 */
export const SPEECH_TAGS: Partial<Record<LanguageCode, string>> = {
  en: 'en-US',
  zh: 'zh-CN',
  zht: 'zh-TW',
  pt: 'pt-BR',
  ptpt: 'pt-PT',
  he: 'he-IL',
  no: 'nb-NO', // "no" is a macrolanguage with no voice; Bokmål is the spoken one
  ko: 'ko-KR',
  ja: 'ja-JP',
  el: 'el-GR',
  km: 'km-KH',
  ta: 'ta-IN',
  ml: 'ml-IN',
  gu: 'gu-IN',
  hi: 'hi-IN',
};

/**
 * Languages with no text-to-speech voice on iOS, Android or the web.
 *
 * The speaker button is hidden for these. An engine handed an unsupported tag
 * falls back to the device language rather than failing, so the alternative
 * is Hmong text read aloud in an English accent - worse than no button.
 */
export const SILENT_LANGUAGES: ReadonlySet<LanguageCode> = new Set<LanguageCode>([
  'hmn', // Hmong
  'ht',  // Haitian Creole
  'sl',  // Slovenian
]);

export function speechTagFor(lang: LanguageCode): string {
  return SPEECH_TAGS[lang] ?? lang;
}

/** Whether read-aloud can be offered at all in this language. */
export function canSpeak(lang: LanguageCode): boolean {
  return !SILENT_LANGUAGES.has(lang);
}
