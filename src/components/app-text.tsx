import { Text, type TextProps } from 'react-native';

import { Colors, Typography, type ColorName, type TypographyVariant } from '@/constants/design';

export interface AppTextProps extends TextProps {
  /** Which step of the type scale to render. Defaults to `bodyLg` (18/400). */
  variant?: TypographyVariant;
  /** Palette color for the text. Defaults to `ink` (body charcoal). */
  color?: ColorName;
  /** Convenience for centered text. */
  center?: boolean;
}

/**
 * The single text primitive for the app. Applies the DM Sans type scale
 * (correct family-per-weight, size, line height, letter spacing) so screens
 * never hand-set font styles. Pass `style` to fine-tune; it wins over defaults.
 *
 * @example <AppText variant="headlineLg" color="navy">Hello, Maria.</AppText>
 */
export function AppText({
  variant = 'bodyLg',
  color = 'ink',
  center,
  style,
  ...rest
}: AppTextProps) {
  return (
    <Text
      style={[Typography[variant], { color: Colors[color] }, center && { textAlign: 'center' }, style]}
      {...rest}
    />
  );
}
