/**
 * UI-chrome translation runtime (question CONTENT is handled separately by
 * lib/i18n.ts + the backend's LocalizedText objects).
 *
 * Mirrors the website's approach: a flat dictionary + a tiny accessor with
 * per-string English fallback, so untranslated strings simply stay English.
 * Adds what the website never needed: named interpolation ("{count}") and
 * plural selection via Intl.PluralRules - English "+ 's'" logic is wrong in
 * a dozen of the supported languages (Slavic few/many, Arabic's six forms).
 */

import type { LanguageCode } from '@/constants/brand';
import {
  UI_PLURALS,
  UI_STRINGS,
  type UiEntry,
  type UiKey,
  type UiPluralEntry,
  type UiPluralKey,
} from '@/lib/ui-strings';

type Vars = Record<string, string | number>;

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  let out = template;
  for (const [name, value] of Object.entries(vars)) {
    out = out.split(`{${name}}`).join(String(value));
  }
  return out;
}

/** The string for `key` in `lang`, falling back to English. */
export function t(key: UiKey, lang: LanguageCode, vars?: Vars): string {
  const entry: UiEntry = UI_STRINGS[key];
  return interpolate(entry[lang] ?? entry.en, vars);
}

/** Non-standard codes that Intl needs spelled differently. */
const PLURAL_LOCALES: Partial<Record<LanguageCode, string>> = {
  zht: 'zh-Hant',
  ptpt: 'pt-PT',
  hmn: 'en', // Hmong plural rules aren't in ICU; English one/other is correct for Hmong anyway (no plural inflection)
};

/** The one method this module needs, so a fallback can stand in for the real thing. */
type PluralSelector = { select(count: number): Intl.LDMLPluralRule };

/**
 * Last-resort selector for runtimes with no plural rules at all.
 *
 * Hermes on iOS ships without `Intl.PluralRules`, so the constructor is
 * `undefined` and calling it throws "undefined cannot be used as a
 * constructor" during render. The old code had a try/catch, but its fallback
 * called the same missing constructor, so the catch threw too and the error
 * escaped. The app could not run on iOS at all before SDK 57, which is why
 * this went unseen: every browser has `Intl`, so the web build was fine.
 *
 * One/other is English's rule. For Slavic few/many or Arabic's six forms it
 * picks a less precise category, but `tCount` already falls back to each
 * entry's `other` form, so the result is a real string in the right language
 * rather than a crash.
 */
const ENGLISH_LIKE: PluralSelector = {
  select: (count) => (count === 1 ? 'one' : 'other'),
};

const hasPluralRules = typeof Intl !== 'undefined' && typeof Intl.PluralRules === 'function';

const rulesCache = new Map<LanguageCode, PluralSelector>();

function pluralRules(lang: LanguageCode): PluralSelector {
  let rules = rulesCache.get(lang);
  if (!rules) {
    rules = buildSelector(lang);
    rulesCache.set(lang, rules);
  }
  return rules;
}

function buildSelector(lang: LanguageCode): PluralSelector {
  if (!hasPluralRules) return ENGLISH_LIKE;
  try {
    return new Intl.PluralRules(PLURAL_LOCALES[lang] ?? lang);
  } catch {
    // The constructor exists but this locale has no data. English is still
    // worth trying, and a build with no locale data at all gets the fallback.
    try {
      return new Intl.PluralRules('en');
    } catch {
      return ENGLISH_LIKE;
    }
  }
}

/**
 * Plural-aware t(). Selects the CLDR category for `count` in `lang` and
 * interpolates `{count}` plus any extra vars. Falls back per entry to the
 * language's `other` form, then to English.
 */
export function tCount(
  key: UiPluralKey,
  count: number,
  lang: LanguageCode,
  vars?: Vars,
): string {
  const entry: UiPluralEntry = UI_PLURALS[key];
  const forms = entry[lang] ?? entry.en;
  const category = pluralRules(lang).select(count);
  const template = forms[category] ?? forms.other;
  return interpolate(template, { count, ...vars });
}
