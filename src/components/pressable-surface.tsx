import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { PRESS_SCALE, SPRING_SNAPPY } from '@/constants/motion';

export interface PressableSurfaceProps extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  /** How much to shrink. Controls press harder than large surfaces do. */
  weight?: keyof typeof PRESS_SCALE;
  /** Applied to the animated container. */
  style?: StyleProp<ViewStyle>;
  /** Opt out of the scale entirely (e.g. an element already inside one). */
  animate?: boolean;
}

/**
 * The app's single press behaviour.
 *
 * Two things make a tap feel direct rather than laggy. First, feedback starts
 * on press-*down*, not on release - waiting for the tap to complete before
 * acknowledging it is the difference between an interface that answers and one
 * that reports. Second, the response is a spring rather than a timed
 * transition, so releasing mid-press redirects the motion from wherever it
 * currently is instead of finishing the old animation and jumping.
 *
 * Scale is used rather than opacity because it reads on every background. A
 * navy button dimming by 15% is nearly invisible; the same button shrinking
 * 3% is unmistakable, and it costs nothing on the compositor.
 *
 * Reduced motion is handled inside the spring config, so this stays a plain
 * state change for anyone who asked the OS for that.
 */
export function PressableSurface({
  children,
  weight = 'control',
  style,
  animate = true,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: PressableSurfaceProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      disabled={disabled}
      onPressIn={(e) => {
        if (animate && !disabled) scale.value = withSpring(PRESS_SCALE[weight], SPRING_SNAPPY);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (animate) scale.value = withSpring(1, SPRING_SNAPPY);
        onPressOut?.(e);
      }}
      {...rest}>
      <Animated.View style={[style, animate && animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
