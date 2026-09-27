import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { AppText } from '@/components/app-text';
import { Colors, Radius, Sizing, Spacing, type ColorName } from '@/constants/design';

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
 * Primary action button. Meets the design system's 56px minimum touch target,
 * 16px radius, and bold 18px label. Flat - no shadow.
 *
 * All visual chrome lives on an inner View: the Pressable is kept as a bare
 * behavior/hit-target wrapper and pressed state is tracked in React state.
 * (Historically function-form `style` on Pressable was swallowed by NativeWind's
 * css-interop wrapper; NativeWind is gone, but the pattern stays for stability.)
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
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
  const [pressed, setPressed] = useState(false);
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || loading;
  const contentColor = labelColor ?? (isPrimary ? 'onNavy' : 'navy');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      {...rest}>
      <View
        style={[
          styles.base,
          isPrimary ? styles.primary : styles.secondary,
          !fullWidth && styles.hugContent,
          pressed && !isDisabled && styles.pressed,
          isDisabled && styles.disabled,
          style,
        ]}>
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: Sizing.buttonMin,
    borderRadius: Radius.lg,
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
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.4,
  },
});
