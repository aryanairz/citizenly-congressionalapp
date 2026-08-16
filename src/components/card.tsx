import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { AppText } from '@/components/app-text';
import { Colors, Radius, Sizing, Spacing } from '@/constants/design';

export interface CardProps {
  children: ReactNode;
  /** `white` = bordered white card; `muted` = faint grey grouped surface. */
  surface?: 'white' | 'muted';
  style?: StyleProp<ViewStyle>;
}

/** A flat, rounded content bucket — 16px radius, 1px hairline border, roomy padding. */
export function Card({ children, surface = 'white', style }: CardProps) {
  return (
    <View style={[styles.card, surface === 'muted' && styles.cardMuted, style]}>{children}</View>
  );
}

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Small red pill rendered next to the title, e.g. "NEW". */
  badge?: string;
  /** Leading element, e.g. an icon in a circle. */
  left?: ReactNode;
  /** Trailing element. Defaults to a chevron; pass `null` to hide it. */
  right?: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Edge-to-edge tappable row with a large 72px target, title + optional subtitle,
 * a leading slot, and a trailing chevron by default. Renders as a static row
 * when `onPress` is omitted.
 */
export function ListRow({ title, subtitle, badge, left, right, onPress, style }: ListRowProps) {
  // Pressed state is tracked here (not via Pressable's render-function children)
  // because NativeWind's css-interop wrapper around Pressable has proven
  // unreliable with function-form props — see Button for the same pattern.
  const [pressed, setPressed] = useState(false);

  const content = (
    <View style={[styles.row, pressed && styles.rowPressed, style]}>
      {left ? <View style={styles.left}>{left}</View> : null}
      <View style={styles.rowText}>
        <View style={styles.titleRow}>
          <AppText variant="labelLg" color="navy">
            {title}
          </AppText>
          {badge ? (
            <View style={styles.badge}>
              <AppText variant="labelMd" color="white" style={styles.badgeText}>
                {badge}
              </AppText>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <AppText variant="labelMd" color="muted">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right === undefined ? (
        <MaterialIcons name="chevron-right" size={24} color={Colors.subtle} />
      ) : (
        right
      )}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}>
      {content}
    </Pressable>
  );
}

export interface DividerProps {
  /** Inset the line by the standard side margin on both ends. */
  inset?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** 1px hairline separator in the outline-variant grey. */
export function Divider({ inset = false, style }: DividerProps) {
  return <View style={[styles.divider, inset && styles.dividerInset, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  cardMuted: {
    backgroundColor: Colors.surfaceMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: Sizing.rowMin,
    paddingVertical: Spacing.md,
  },
  rowPressed: {
    opacity: 0.6,
  },
  left: {
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  badge: {
    backgroundColor: Colors.red,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  dividerInset: {
    marginHorizontal: Spacing.screenX,
  },
});
