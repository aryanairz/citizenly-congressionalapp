import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Colors, Radius, Spacing } from '@/constants/design';

export interface ScreenHeaderProps {
  /** Defaults to going back, or to the dashboard when there's no history. */
  onBack?: () => void;
  /** Optional centered title. */
  title?: string;
}

/**
 * Minimal screen header: a large back target on the left, optional centered
 * title. Flat, white, no border - hierarchy comes from the content below.
 */
export function ScreenHeader({ onBack, title }: ScreenHeaderProps) {
  const router = useRouter();
  const [pressed, setPressed] = useState(false);

  /**
   * `router.back()` does nothing when there is no history to pop - which is
   * exactly what happens after a web reload or a deep link straight into a
   * screen. Fall back to the dashboard so the arrow always goes somewhere.
   */
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/dashboard');
  };

  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={onBack ?? goBack}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        hitSlop={8}>
        <View style={[styles.backTarget, pressed && styles.pressed]}>
          <MaterialIcons name="arrow-back" size={28} color={Colors.navy} />
        </View>
      </Pressable>
      {title ? (
        <AppText variant="labelLg" color="navy" center style={styles.title}>
          {title}
        </AppText>
      ) : null}
      {/* Balances the back button so the title stays optically centered. */}
      {title ? <View style={styles.balance} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    // Pull the icon's inner padding out of the layout so it aligns with content.
    marginLeft: -Spacing.sm,
  },
  backTarget: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  pressed: {
    backgroundColor: Colors.surfaceMuted,
  },
  title: {
    flex: 1,
  },
  balance: {
    width: 48,
  },
});
