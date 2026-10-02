import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { AppText } from '@/components/app-text';
import { PressableSurface } from '@/components/pressable-surface';
import {
  AbsoluteFill,
  Colors,
  Elevation,
  Radius,
  Sizing,
  Spacing,
  type ColorName,
} from '@/constants/design';

type ButtonVariant = 'primary' | 'secondary';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  /** `primary` = navy fill; `secondary` = white with navy border. */
  variant?: ButtonVariant;
  /** Stretch to fill the parent's width. Defaults to true. */
  fullWidth?: boolean;
  /** Show a spinner and block presses. */
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** Override the label/spinner color (defaults to white on primary, navy on secondary). */
  labelColor?: ColorName;
  /**
   * Applied to the visual container (the inner View), NOT the outer Pressable.
   * Use for chrome (colors, borders, padding). Layout styles like `flex: 1`
   * will NOT size the button within a row - wrap the Button in a View that
   * carries the flex instead.
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * Primary action button. 56px minimum target, 16px radius, bold 18px label.
 *
 * The press is a spring-driven scale rather than an opacity dip, because a
 * navy fill barely registers a dip but reads a 3% shrink clearly. Primary
 * buttons carry a soft navy-tinted shadow so the main action on a screen sits
 * slightly above the page rather than being painted onto it.
 *
 * Visual chrome lives on an inner View, never on the Pressable itself, so
 * layout and behaviour stay separable.
 */
export function Button({
  label,
  variant = 'primary',
  fullWidth = true,
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  labelColor,
  style,
  ...rest
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || loading;
  const contentColor = labelColor ?? (isPrimary ? 'onNavy' : 'navy');

  return (
    <PressableSurface
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      weight="control"
      style={!fullWidth ? styles.hugContent : undefined}
      {...rest}>
      <View
        style={[
          styles.base,
          isPrimary ? styles.primary : styles.secondary,
          isPrimary && !isDisabled && Elevation.raised,
          isDisabled && styles.disabled,
          style,
        ]}>
        {/* A barely-there vertical sheen. Light falls from above, so the top
            of a real surface is fractionally brighter than its bottom; the
            navy stops reading as a flat swatch and starts reading as a lit
            object. Two percent is enough - any more and it looks like a
            gradient rather than like light. */}
        {isPrimary ? (
          <LinearGradient
            colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0)']}
            style={styles.sheen}
            pointerEvents="none"
          />
        ) : null}
        {loading ? (
          <ActivityIndicator color={Colors[contentColor]} />
        ) : (
          <View style={styles.content}>
            {leftIcon}
            <AppText variant="labelLg" color={contentColor}>
              {label}
            </AppText>
            {rightIcon}
          </View>
        )}
      </View>
    </PressableSurface>
  );
}

const styles = StyleSheet.create({
  sheen: {
    ...AbsoluteFill,
    borderRadius: Radius.lg,
    // Only the upper half catches the light.
    bottom: '50%',
  },
  base: {
    minHeight: Sizing.buttonMin,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: Colors.navy,
  },
  secondary: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.navy,
  },
  hugContent: {
    alignSelf: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  disabled: {
    opacity: 0.4,
  },
});
