/**
 * Citizenly design tokens - the SINGLE SOURCE OF TRUTH for colors, spacing,
 * radius, sizing, and the DM Sans type scale.
 *
 * Plain CommonJS (not TS) so it can be consumed by both Node tooling and the
 * typed runtime layer (src/constants/design.ts). Edit values HERE and they
 * flow to every StyleSheet through the `design.ts` exports.
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

/** DM Sans family names - must match the keys loaded via useFonts(). */
const fontFamily = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
};

/**
 * The type scale. `family` keys into fontFamily; `letterSpacing`/`lineHeight`
 * are in px (RN points).
 *
 * Tracking is size-specific, never one value for everything. Letters read as
 * drifting apart the larger they get, so display sizes take negative tracking;
 * small text takes slightly positive tracking to stay legible. Leading moves
 * the opposite way: tight on headlines, generous on body copy, and generous
 * again here because the reader is often elderly and reading a second
 * language.
 *
 * -0.02em is the target for display sizes, which is where the pixel values
 * below come from (32 * -0.02 = -0.64).
 */
const typography = {
  headlineLg: { size: 32, lineHeight: 38, letterSpacing: -0.64, weight: '700', family: 'bold' },
  headlineMd: { size: 24, lineHeight: 30, letterSpacing: -0.36, weight: '700', family: 'bold' },
  questionText: { size: 22, lineHeight: 31, letterSpacing: -0.22, weight: '500', family: 'medium' },
  bodyLg: { size: 18, lineHeight: 28, letterSpacing: 0, weight: '400', family: 'regular' },
  bodyMd: { size: 16, lineHeight: 24, letterSpacing: 0, weight: '400', family: 'regular' },
  labelLg: { size: 18, lineHeight: 24, letterSpacing: -0.18, weight: '700', family: 'bold' },
  labelMd: { size: 14, lineHeight: 18, letterSpacing: 0.7, weight: '600', family: 'semibold' },
};

/**
 * Depth. Bigger surfaces read as thicker: a floating bar sits further off the
 * page than a resting card, so it gets a wider, softer shadow rather than a
 * darker one. Shadows stay low-opacity and navy-tinted rather than black,
 * which keeps them from muddying the white ground.
 *
 * `elevation` is the Android channel; iOS reads the shadow* keys. Both are
 * provided so depth survives the platform gap.
 */
const elevation = {
  /** Resting surfaces: cards, option rows. Barely there, but not flat. */
  card: {
    shadowColor: '#1B2A4A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  /** Lifted while pressed or selected. */
  raised: {
    shadowColor: '#1B2A4A',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  /** Floating chrome that content scrolls beneath: bottom nav, sticky footers. */
  chrome: {
    shadowColor: '#1B2A4A',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
};

module.exports = { colors, spacing, radius, sizing, fontFamily, typography, elevation };
