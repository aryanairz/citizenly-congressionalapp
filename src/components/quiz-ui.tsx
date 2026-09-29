/**
 * Shared question-answering UI used by both the Quiz and Review Mistakes
 * screens: A/B/C/D option cards, the sliding feedback panel, and the option
 * shuffle helper. Extracted from quiz.tsx so both screens stay pixel-identical.
 */

import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Animated, { SlideInDown, ZoomIn } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { PressableSurface } from '@/components/pressable-surface';
import { Colors, Elevation, Radius, Spacing } from '@/constants/design';
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
        {/* The verdict icon scales in with a little overshoot: the one place
            bounce is earned, because it lands on the user's own answer. */}
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
      // Gentle spring: eases in and settles instead of snapping into place.
      entering={SlideInDown.springify().damping(22).stiffness(190).mass(0.9)}
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
      {!correct ? (
        <AppText variant="labelLg" color="navy">
          Correct answer: {correctAnswer}
        </AppText>
      ) : null}
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
