import { useEffect } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Colors, Radius } from '@/constants/design';
import { SPRING } from '@/constants/motion';

export interface ProgressBarProps {
  /** 0-100. Values outside the range are clamped. */
  percent: number;
  /** Override for use on a dark surface, where the default track vanishes. */
  trackColor?: string;
  fillColor?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * A progress track whose fill springs to each new value.
 *
 * Snapping the width would make progress feel like a readout; growing into it
 * makes the same number feel earned. The spring is critically damped, so it
 * arrives without wobbling - this sits under a count that must stay readable.
 *
 * Because the animation targets a shared value rather than a style prop, an
 * update that lands mid-flight retargets from wherever the bar currently is
 * instead of restarting.
 */
export function ProgressBar({ percent, trackColor, fillColor, style }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const width = useSharedValue(clamped);

  useEffect(() => {
    width.value = withSpring(clamped, SPRING);
  }, [clamped, width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View
      style={[styles.track, trackColor ? { backgroundColor: trackColor } : null, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}>
      <Animated.View
        style={[styles.fill, fillColor ? { backgroundColor: fillColor } : null, fillStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
    backgroundColor: Colors.navy,
  },
});
