/**
 * UI-chrome translation runtime (question CONTENT is handled separately by
 * lib/i18n.ts + the backend's LocalizedText objects).
 *
 * Mirrors the website's approach: a flat dictionary + a tiny accessor with
 * per-string English fallback, so untranslated strings simply stay English.
 * Adds what the website never needed: named interpolation ("{count}") and
 * plural selection via Intl.PluralRules — English "+ 's'" logic is wrong in
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

const rulesCache = new Map<LanguageCode, Intl.PluralRules>();

function pluralRules(lang: LanguageCode): Intl.PluralRules {
  let rules = rulesCache.get(lang);
  if (!rules) {
    try {
      rules = new Intl.PluralRules(PLURAL_LOCALES[lang] ?? lang);
    } catch {
      rules = new Intl.PluralRules('en');
    }
    rulesCache.set(lang, rules);
  }
  return rules;
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
