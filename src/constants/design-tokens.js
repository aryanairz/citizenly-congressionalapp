/**
 * Citizenly design tokens — the SINGLE SOURCE OF TRUTH for colors, spacing,
 * radius, sizing, and the DM Sans type scale.
 *
 * This is plain CommonJS (not TS) on purpose: it is consumed by BOTH
 *   - tailwind.config.js (build-time, Node) via require(), and
 *   - src/constants/design.ts (runtime, typed) via import.
 * Edit values HERE and they flow to both NativeWind classes and JS/StyleSheet.
 *
 * Palette is the real Citizenly brand, NOT the drifted Material palette in the
 * Stitch export (design.md frontmatter). Values distilled from the corrected
 * `*_updated` screen exports + the DESIGN.md prose.
 */

/** Brand + neutral palette. Navy primary, red for critical actions only. */
const colors = {
  navy: '#1B2A4A', // primary: headers, primary buttons, key navigation
  red: '#C41E3A', // accent/critical: errors, destructive, "incorrect"
  white: '#FFFFFF', // edge-to-edge background / surface
  ink: '#212121', // body text (charcoal, ~15:1 on white, easier than pure black)
  muted: '#4A5568', // secondary / supporting text
  border: '#E2E8F0', // hairline dividers + default input/card outlines
  subtle: '#94A3B8', // placeholder text, disabled icons (lighter than `muted`)
  surfaceMuted: '#F8FAFC', // faint grey grouped surface (used sparingly)
  navyTint: '#EEF2F8', // faint navy fill for selected states
  onNavy: '#FFFFFF', // text/icons on a navy surface
  // Semantic result colors (quiz/interview feedback). Dark enough for WCAG
  // contrast on white; each has a faint tint for banner backgrounds.
  success: '#15803D',
  successTint: '#EAF5EE',
  warning: '#B45309',
  warningTint: '#FDF1E3',
  redTint: '#FBEBEE', // faint red fill for "incorrect" banners
};

/** 8px spacing grid. Values are numbers (RN points). */
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  screenX: 24, // global horizontal screen margin
};

/** Corner radius. 16 (lg) is the standard for interactive components + cards. */
const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

/** Minimum touch/target sizes (accessibility for ages 50–75). */
const sizing = {
  buttonMin: 56,
  inputMin: 64,
  rowMin: 72,
  hairline: 1,
};

/** DM Sans family names — must match the keys loaded via useFonts(). */
const fontFamily = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
};

/**
 * The type scale. `family` keys into fontFamily; `letterSpacing`/`lineHeight`
 * are in px (RN points). Weight is kept alongside the explicit family so text
 * renders correctly whether or not synthetic weighting is applied.
 */
const typography = {
  headlineLg: { size: 32, lineHeight: 40, letterSpacing: -0.6, weight: '700', family: 'bold' },
  headlineMd: { size: 24, lineHeight: 32, letterSpacing: -0.24, weight: '700', family: 'bold' },
  questionText: { size: 22, lineHeight: 30, letterSpacing: 0, weight: '500', family: 'medium' },
  bodyLg: { size: 18, lineHeight: 28, letterSpacing: 0, weight: '400', family: 'regular' },
  bodyMd: { size: 16, lineHeight: 24, letterSpacing: 0, weight: '400', family: 'regular' },
  labelLg: { size: 18, lineHeight: 24, letterSpacing: 0, weight: '700', family: 'bold' },
  labelMd: { size: 14, lineHeight: 18, letterSpacing: 0.7, weight: '600', family: 'semibold' },
};

module.exports = { colors, spacing, radius, sizing, fontFamily, typography };
