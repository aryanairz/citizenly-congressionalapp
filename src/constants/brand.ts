/**
 * Citizenly brand constants: colors and supported study languages.
 *
 * Import from here when you need the raw hex values outside the design-token
 * pipeline (e.g. StatusBar, native tint colors); screen styling should go
 * through src/constants/design.ts.
 */

export const BrandColors = {
  navy: '#1B2A4A',
  red: '#C41E3A',
  white: '#FFFFFF',
} as const;

export type BrandColor = keyof typeof BrandColors;

/**
 * Language codes used across the app and shared backend to key content.
 * Must exactly match the website's `Lang` union (data/questions.ts) — note the
 * non-ISO ones: `zht` (Traditional Chinese), `ptpt` (European Portuguese),
 * `hmn` (Hmong).
 */
export type LanguageCode =
  | 'en'
  | 'es'
  | 'zh'
  | 'tl'
  | 'vi'
  | 'pl'
  | 'fr'
  | 'ko'
  | 'ru'
  | 'hi'
  | 'pt'
  | 'de'
  | 'it'
  | 'gu'
  | 'uk'
  | 'el'
  | 'hmn'
  | 'ml'
  | 'ro'
  | 'nl'
  | 'sr'
  | 'bs'
  | 'hr'
  | 'bg'
  | 'cs'
  | 'hu'
  | 'sk'
  | 'sl'
  | 'ja'
  | 'th'
  | 'km'
  | 'zht'
  | 'tr'
  | 'lt'
  | 'lv'
  | 'et'
  | 'ptpt'
  | 'ca'
  | 'ta'
  | 'ht'
  | 'ar'
  | 'he'
  | 'sq'
  | 'id'
  | 'sv'
  | 'no'
  | 'da'
  | 'fi';

export interface Language {
  /** Code used as the key in question/option/explanation objects. */
  code: LanguageCode;
  /** English name of the language. */
  name: string;
  /** The language's own name, in its native script. */
  nativeName: string;
}

/**
 * The 48 languages Citizenly supports, in the website's picker order so the
 * two platforms feel consistent. `nativeName` is what elderly learners
 * recognize, so it's what the language picker should show.
 */
export const LANGUAGES: readonly Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'tl', name: 'Tagalog', nativeName: 'Tagalog' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'pt', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'hmn', name: 'Hmong', nativeName: 'Hmoob' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ' },
  { code: 'zht', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti' },
  { code: 'ptpt', name: 'Portuguese (Portugal)', nativeName: 'Português (Portugal)' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'ht', name: 'Haitian Creole', nativeName: 'Kreyòl Ayisyen' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
] as const;

/** Codes only, handy for validation and building the localized content type. */
export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as LanguageCode[];

/**
 * Native names shown in the welcome-screen marquee, matching the website's
 * marquee (all languages the Citizenly platform offers). Display-only: the
 * in-app picker and content keys still come from LANGUAGES above.
 */
export const MARQUEE_LANGUAGE_NAMES: readonly string[] = [
  'English',
  'Español',
  '简体中文',
  'Tagalog',
  'Tiếng Việt',
  'Polski',
  'Français',
  '한국어',
  'Русский',
  'हिन्दी',
  'Português (Brasil)',
  'Português (Portugal)',
  'Català',
  'தமிழ்',
  'Kreyòl Ayisyen',
  'العربية',
  'עברית',
  'Deutsch',
  'Italiano',
  'ગુજરાતી',
  'Українська',
  'Ελληνικά',
  'Hmoob',
  'മലയാളം',
  'Română',
  'Nederlands',
  'Српски',
  'Bosanski',
  'Hrvatski',
  'Български',
  'Čeština',
  'Magyar',
  'Slovenčina',
  'Slovenščina',
  '日本語',
  'ไทย',
  'ខ្មែរ',
  '繁體中文',
  'Türkçe',
  'Lietuvių',
  'Latviešu',
  'Eesti',
  'Svenska',
  'Norsk',
  'Dansk',
  'Suomi',
  'Bahasa Indonesia',
  'Shqip',
] as const;
