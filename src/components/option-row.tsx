import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/app-text';
import { Colors, Radius, Sizing, Spacing } from '@/constants/design';

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
 * A large tappable selection row/card: 72px minimum target, 16px radius,
 * constant 2px border (neutral → navy + faint navy tint when selected) plus a
 * check icon so selection is never shown by color alone.
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
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}>
      <View
        style={[
          styles.row,
          selected && styles.selected,
          pressed && styles.pressed,
          style,
        ]}>
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
          <MaterialIcons name="check-circle" size={26} color={Colors.navy} />
        ) : null}
      </View>
    </Pressable>
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
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
  },
  selected: {
    borderColor: Colors.navy,
    backgroundColor: Colors.navyTint,
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    flex: 1,
    gap: Spacing.xs,
  },
  // RTL titles (العربية, עברית) must not right-align inside their flex box —
  // this keeps the native name on the left like every other row. The string's
  // own right-to-left glyph order is untouched.
  title: {
    textAlign: 'left',
  },
  trailing: {
    letterSpacing: 0,
  },
});
