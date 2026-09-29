import { MaterialIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  ZoomIn,
} from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { PressableSurface } from '@/components/pressable-surface';
import { Colors, Elevation, Radius, Sizing, Spacing } from '@/constants/design';
import { SPRING } from '@/constants/motion';

export interface OptionRowProps {
  title: string;
  /** Longer explanation under the title (turns the row into a card). */
  description?: string;
  /** Small muted label on the right, e.g. the English name of a language. */
  trailingLabel?: string;
  selected?: boolean;
  /** Show a check icon on the selected row. Defaults to true. */
  checkmark?: boolean;
  onPress: () => void;
  /** Suppress letter-spacing-free rendering issues by leaving title styling alone. */
  style?: StyleProp<ViewStyle>;
}

/**
 * A large tappable selection row: 72px minimum target, 16px radius, constant
 * 2px border so selecting never shifts the layout.
 *
 * Selecting is the one moment on these screens that deserves real motion. The
 * border and fill cross-fade on a spring rather than snapping, and the
 * checkmark scales in with a little overshoot - the one place bounce is
 * earned, because the user's tap is what threw it there. Selection is still
 * carried by three signals at once (border, fill, icon), never colour alone.
 */
export function OptionRow({
  title,
  description,
  trailingLabel,
  selected = false,
  checkmark = true,
  onPress,
  style,
}: OptionRowProps) {
  // 0 = unselected, 1 = selected. Drives border and fill together so they
  // can never disagree mid-transition.
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(selected ? 1 : 0, SPRING);
  }, [selected, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(progress.value, [0, 1], [Colors.border, Colors.navy]),
    backgroundColor: interpolateColor(progress.value, [0, 1], [Colors.white, Colors.navyTint]),
  }));

  return (
    <PressableSurface
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      weight="surface">
      <Animated.View
        style={[styles.row, animatedStyle, selected && Elevation.card, style]}>
        <View style={styles.text}>
          <AppText variant="labelLg" color="navy" style={styles.title}>
            {title}
          </AppText>
          {description ? (
            <AppText variant="bodyMd" color="muted">
              {description}
            </AppText>
          ) : null}
        </View>
        {trailingLabel ? (
          <AppText variant="labelMd" color="muted" style={styles.trailing}>
            {trailingLabel}
          </AppText>
        ) : null}
        {selected && checkmark ? (
          <Animated.View entering={ZoomIn.springify().damping(12).stiffness(220)}>
            <MaterialIcons name="check-circle" size={26} color={Colors.navy} />
          </Animated.View>
        ) : null}
      </Animated.View>
    </PressableSurface>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: Sizing.rowMin,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    // Constant 2px border so selecting never shifts the layout.
    borderWidth: 2,
    borderRadius: Radius.xl,
  },
  text: {
    flex: 1,
    gap: Spacing.xs,
  },
  // RTL titles (العربية, עברית) must not right-align inside their flex box -
  // this keeps the native name on the left like every other row. The string's
  // own right-to-left glyph order is untouched.
  title: {
    textAlign: 'left',
  },
  trailing: {
    letterSpacing: 0,
  },
});
