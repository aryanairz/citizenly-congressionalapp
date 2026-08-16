import { StyleSheet, View } from 'react-native';

import { Colors, Spacing } from '@/constants/design';

export interface StepDotsProps {
  /** Total number of steps. */
  total: number;
  /** Zero-based index of the current step. */
  current: number;
}

/** Onboarding progress: a row of dots with the current step stretched into a navy pill. */
export function StepDots({ total, current }: StepDotsProps) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.dot, i === current && styles.active]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
  },
  active: {
    width: 28,
    backgroundColor: Colors.navy,
  },
});
