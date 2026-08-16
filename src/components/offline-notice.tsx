import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Colors, Spacing } from '@/constants/design';

/**
 * Small inline notice shown when the live question feed couldn't be reached
 * and the offline practice set is being used instead.
 */
export function OfflineNotice({ onRetry }: { onRetry: () => void }) {
  const [pressed, setPressed] = useState(false);

  return (
    <View style={styles.row}>
      <MaterialIcons name="cloud-off" size={16} color={Colors.muted} />
      <AppText variant="labelMd" color="muted" style={styles.text}>
        Offline practice questions
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry loading questions"
        onPress={onRetry}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        hitSlop={8}>
        <AppText
          variant="labelMd"
          color="navy"
          style={[styles.retry, pressed && styles.pressed]}>
          Retry
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  text: {
    letterSpacing: 0,
  },
  retry: {
    textDecorationLine: 'underline',
    letterSpacing: 0,
  },
  pressed: {
    opacity: 0.6,
  },
});
