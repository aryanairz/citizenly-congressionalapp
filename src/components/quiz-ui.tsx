/**
 * Shared question-answering UI used by both the Quiz and Review Mistakes
 * screens: A/B/C/D option cards, the sliding feedback panel, and the option
 * shuffle helper. Extracted from quiz.tsx so both screens stay pixel-identical.
 */

import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useRef } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { PressableSurface } from '@/components/pressable-surface';
import { Colors, Elevation, Radius, Spacing } from '@/constants/design';
import { ENTER_PANEL } from '@/constants/motion';
import { t } from '@/lib/ui-i18n';
import { useLang } from '@/lib/use-lang';

export type OptionVisual = 'default' | 'selected' | 'correct' | 'wrong' | 'dimmed';

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Fisher–Yates over option indices - the feed stores the correct answer at index 0. */
export function shuffledIndices(count: number): number[] {
  const indices = Array.from({ length: count }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

/** Breathing room left below the graded card once it is scrolled into view. */
const REVEAL_MARGIN = Spacing.sm;

/**
 * Keeps the graded option on screen once the answer is checked.
 *
 * The feedback panel is a sibling below the list, so grading takes roughly
 * 140px off the scroll viewport. The list is centred, which means an
 * overflowing list shows its top and drops the rest off the bottom edge, and
 * the card that gets dropped is often the one the user needs to see. Naming
 * the answer in the panel helps, but it does not show them which card they
 * should have picked.
 *
 * Both measurements are taken in window coordinates and compared against the
 * live scroll offset, rather than reconstructing the card's position in the
 * content from a chain of `onLayout` offsets. That chain has to account for
 * content padding and for a centred group that stops being centred the moment
 * the list overflows, and getting any of it slightly wrong leaves the card a
 * few pixels short of clear. Asking the two views where they actually are
 * cannot drift.
 *
 * The scroll is driven from the ScrollView's `onLayout`, not an effect on
 * `checked`: an effect runs before the layout pass, so it would measure the
 * viewport at its old, taller height. It then waits one frame, because the
 * views are still settling when that fires.
 *
 * It jumps rather than animates on purpose. The group is already running its
 * layout spring, and a second, differently-timed movement is exactly what
 * made this screen feel unsettled before.
 */
export function useGradedOptionReveal() {
  const scrollRef = useRef<ScrollView>(null);
  // ScrollView does not expose measureInWindow, so the viewport is measured
  // through a plain View wrapped around it.
  const viewportRef = useRef<View>(null);
  const scrollY = useRef(0);
  const cardRefs = useRef<Record<number, View | null>>({});
  const pending = useRef<number | null>(null);

  /** Call when the answer is graded, with the correct card's display index. */
  const reveal = useCallback((displayIndex: number) => {
    pending.current = displayIndex;
  }, []);

  /** Call when a new question is shown, to return to the top of the list. */
  const reset = useCallback(() => {
    pending.current = null;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
  }, []);

  const onScrollLayout = useCallback(() => {
    const index = pending.current;
    if (index === null || index < 0) return;
    pending.current = null;
    requestAnimationFrame(() => {
      const card = cardRefs.current[index];
      const scroll = scrollRef.current;
      const viewport = viewportRef.current;
      if (!card || !scroll || !viewport) return;
      viewport.measureInWindow((_vx, viewportTop, _vw, viewportHeight) => {
        card.measureInWindow((_cx, cardTop, _cw, cardHeight) => {
          // How far the card's bottom edge sits past the viewport's, plus the
          // gap we want under it. Negative means it is already clear.
          const hidden = cardTop + cardHeight - (viewportTop + viewportHeight) + REVEAL_MARGIN;
          if (hidden > 0) {
            scroll.scrollTo({ y: scrollY.current + hidden, animated: false });
          }
        });
      });
    });
  }, []);

  /** Ref callback for the wrapper around each option card. */
  const registerCard = useCallback(
    (displayIndex: number) => (node: View | null) => {
      cardRefs.current[displayIndex] = node;
    },
    [],
  );

  return { scrollRef, viewportRef, reveal, reset, onScroll, onScrollLayout, registerCard };
}

export function OptionCard({
  letter,
  text,
  visual,
  disabled,
  onPress,
}: {
  letter: string;
  text: string;
  visual: OptionVisual;
  disabled: boolean;
  onPress: () => void;
}) {
  const borderColor =
    visual === 'correct'
      ? Colors.success
      : visual === 'wrong'
        ? Colors.red
        : visual === 'selected'
          ? Colors.navy
          : Colors.border;
  const backgroundColor =
    visual === 'correct'
      ? Colors.successTint
      : visual === 'wrong'
        ? Colors.redTint
        : visual === 'selected'
          ? Colors.navyTint
          : Colors.white;

  const graded = visual === 'correct' || visual === 'wrong';

  return (
    <PressableSurface
      accessibilityRole="button"
      accessibilityLabel={`Answer ${letter}: ${text}`}
      accessibilityState={{ disabled, selected: visual === 'selected' }}
      disabled={disabled}
      onPress={onPress}
      weight="surface">
      <View
        style={[
          styles.option,
          { borderColor, backgroundColor },
          // Dimming the cards that are no longer in play lets the graded
          // answer hold the eye without shouting.
          visual === 'dimmed' && styles.optionDimmed,
          // The graded card lifts off the page. Depth reads before colour
          // does, which matters when the reader is low-vision or colourblind.
          graded && Elevation.raised,
        ]}>
        <View style={styles.letterChip}>
          <AppText variant="labelLg" color="navy">
            {letter}
          </AppText>
        </View>
        <AppText variant="bodyLg" color="ink" style={styles.optionText}>
          {text}
        </AppText>
        {/* The slot is always here, empty until the answer is graded. If the
            icon only appeared on grading it would narrow the text column at
            that moment, and a two-line answer could wrap to three and grow
            the card after everything else had been measured and placed.

            The icon itself scales in with a little overshoot: the one place
            bounce is earned, because it lands on the user's own answer. */}
        <View style={styles.verdict}>
          {visual === 'correct' ? (
            <Animated.View entering={ZoomIn.springify().damping(11).stiffness(200)}>
              <MaterialIcons name="check-circle" size={26} color={Colors.success} />
            </Animated.View>
          ) : null}
          {visual === 'wrong' ? (
            <Animated.View entering={ZoomIn.springify().damping(11).stiffness(200)}>
              <MaterialIcons name="cancel" size={26} color={Colors.red} />
            </Animated.View>
          ) : null}
        </View>
      </View>
    </PressableSurface>
  );
}

/**
 * Bottom feedback panel that slides up after answering. The Next button lives
 * INSIDE it, so the explanation is always seen before moving on.
 */
export function FeedbackPanel({
  correct,
  correctAnswer,
  explanation,
  nextLabel,
  onNext,
  headline,
}: {
  correct: boolean;
  correctAnswer: string;
  explanation: string;
  nextLabel: string;
  onNext: () => void;
  /** Override the result headline (defaults to Correct! / Not quite right). */
  headline?: string;
}) {
  const color = correct ? Colors.success : Colors.red;
  const lang = useLang();

  return (
    <Animated.View
      // Critically damped, so it arrives once. The old spring worked out to a
      // damping ratio of 0.84, which overshot and settled back, pulling the
      // question list down again after it had moved up.
      entering={ENTER_PANEL}
      accessible
      accessibilityLiveRegion="polite"
      style={[
        styles.panel,
        { borderColor: color, backgroundColor: correct ? Colors.successTint : Colors.redTint },
      ]}>
      <View style={styles.panelHeader}>
        <MaterialIcons name={correct ? 'check-circle' : 'cancel'} size={28} color={color} />
        <AppText variant="headlineMd" style={{ color }}>
          {headline ?? (correct ? t('correctBanner', lang) : t('wrongBanner', lang))}
        </AppText>
      </View>
      {/* Shown either way. The graded option card can sit entirely behind this
          panel when the list is taller than what is left of the scroll area,
          and telling someone they are correct without ever naming the answer
          is useless to a person studying for the real test. */}
      <AppText variant="labelLg" color="navy">
        {correct ? correctAnswer : `Correct answer: ${correctAnswer}`}
      </AppText>
      <AppText variant="bodyMd" color="ink">
        {explanation}
      </AppText>
      <Button
        label={nextLabel}
        onPress={onNext}
        rightIcon={<MaterialIcons name="arrow-forward" size={22} color={Colors.onNavy} />}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 72,
    borderWidth: 2,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  optionDimmed: {
    opacity: 0.45,
  },
  letterChip: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  // Fixed, so the text column is the same width graded or not.
  verdict: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    borderWidth: 2,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
