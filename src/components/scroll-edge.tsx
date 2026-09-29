import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

export interface ScrollEdgeProps {
  /** Which way the content fades: above floating chrome, or below a header. */
  direction?: 'up' | 'down';
  /** Height of the fade. Taller reads softer. */
  height?: number;
}

/**
 * The soft edge where scrolling content meets floating chrome.
 *
 * A 1px rule under a header says "these are two separate regions". A short
 * gradient says "there is more content, and it continues underneath" - which
 * is both truer and calmer. Apple uses this everywhere a toolbar floats over
 * a scroll view, and it is the detail that stops chrome from looking bolted on.
 *
 * Pointer events are disabled so the fade never eats a tap meant for the
 * content beneath it.
 */
export function ScrollEdge({ direction = 'up', height = 28 }: ScrollEdgeProps) {
  // 'up' fades content out as it approaches chrome below it, so the opaque
  // end is at the bottom.
  const colors =
    direction === 'up'
      ? (['rgba(255,255,255,0)', 'rgba(255,255,255,1)'] as const)
      : (['rgba(255,255,255,1)', 'rgba(255,255,255,0)'] as const);

  return (
    <LinearGradient
      colors={colors}
      style={[styles.edge, { height }, direction === 'up' ? styles.above : styles.below]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  above: {
    bottom: '100%',
  },
  below: {
    top: '100%',
  },
});
