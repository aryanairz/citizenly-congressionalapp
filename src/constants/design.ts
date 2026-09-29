/**
 * Citizenly theme - the typed design-system API used throughout the app.
 *
 * Raw values live in ./design-tokens.js. This file adds TypeScript types and
 * turns the type scale into ready-to-use React Native TextStyles.
 *
 * Import from here in components:  import { Colors, Spacing, Radius, Typography } from '@/constants/design';
 */

import { Platform, type TextStyle, type ViewStyle } from 'react-native';

import tokens from '@/constants/design-tokens';

export const Colors = tokens.colors;
export const Spacing = tokens.spacing;
export const Radius = tokens.radius;
export const Sizing = tokens.sizing;
export const FontFamily = tokens.fontFamily;

/** Depth presets: Elevation.card, Elevation.raised, Elevation.chrome. */
export const Elevation = tokens.elevation as Record<
  keyof typeof tokens.elevation,
  ViewStyle
>;

export type ElevationName = keyof typeof tokens.elevation;

/**
 * Lining up digits. Proportional figures make a counter jitter as it climbs
 * (1 is narrower than 8), which is distracting on anything that updates in
 * place: question counters, scores, timers.
 */
export const TabularNums = { fontVariant: ['tabular-nums'] } as const satisfies TextStyle;

export type ColorName = keyof typeof Colors;
export type SpacingKey = keyof typeof Spacing;
export type RadiusKey = keyof typeof Radius;

/** Every text style in the system, keyed by role. */
export type TypographyVariant = keyof typeof tokens.typography;

/**
 * Sans fallbacks, web only.
 *
 * If a DM Sans face fails to resolve for any reason - a slow load, a cache
 * miss, a face that was never registered - the browser falls through to its
 * default, and that default is a serif. That is what kept turning text into
 * Times New Roman. Naming explicit sans fallbacks means the worst case is
 * now the platform's own UI font rather than a serif, which is a difference
 * nobody would notice instead of one everybody does.
 *
 * Native ignores comma-separated stacks, so it only ever gets the face name.
 */
const WEB_FALLBACKS =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function familyWithFallback(face: string): string {
  return Platform.OS === 'web' ? `${face}, ${WEB_FALLBACKS}` : face;
}

/**
 * Deliberately emits NO `fontWeight`.
 *
 * DM Sans is loaded as separately named faces (DMSans_400Regular,
 * DMSans_700Bold, ...), each registered at CSS weight `normal`. The family
 * name already carries the weight, so also asking for `fontWeight: 700` tells
 * the browser to find a bold face inside a family that declares none, and
 * where it cannot synthesize one it drops the family entirely.
 *
 * Weight lives in `spec.weight` purely as documentation of which face is which.
 */
function toTextStyle(spec: (typeof tokens.typography)[TypographyVariant]): TextStyle {
  return {
    fontFamily: familyWithFallback(FontFamily[spec.family as keyof typeof FontFamily]),
    fontSize: spec.size,
    lineHeight: spec.lineHeight,
    letterSpacing: spec.letterSpacing,
  };
}

/**
 * Resolved TextStyles for each variant, e.g. Typography.headlineLg.
 * headlineLg 32/700 · headlineMd 24/700 · questionText 22/500 ·
 * bodyLg 18/400 · bodyMd 16/400 · labelLg 18/700 · labelMd 14/600.
 */
export const Typography = Object.fromEntries(
  (Object.keys(tokens.typography) as TypographyVariant[]).map((key) => [
    key,
    toTextStyle(tokens.typography[key]),
  ]),
) as Record<TypographyVariant, TextStyle>;

/** Everything in one object, for ergonomic access / spreading. */
export const theme = {
  colors: Colors,
  spacing: Spacing,
  radius: Radius,
  sizing: Sizing,
  fontFamily: FontFamily,
  typography: Typography,
  elevation: Elevation,
} as const;

export default theme;
