import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppText, BottomNav, Button, ScreenContainer, ScreenHeader } from '@/components';
import { Colors, Radius, Sizing, Spacing } from '@/constants/design';
import { filterByTopic, parseTopicKey } from '@/constants/topics';
import { localize } from '@/lib/i18n';
import { addMistake } from '@/lib/local-mistakes';
import { useOnboarding } from '@/lib/onboarding-context';
import { useSession } from '@/lib/session-context';
import { t } from '@/lib/ui-i18n';
import { useLang } from '@/lib/use-lang';
import { useQuestionPool } from '@/lib/use-question-pool';

const SWIPE_THRESHOLD = 70;

export default function FlashcardsScreen() {
  const session = useSession();
  const { data } = useOnboarding();
  const lang = data.languageCode ?? 'en';

  const params = useLocalSearchParams<{ topic?: string }>();
  const topic = parseTopicKey(params.topic);

  const pool = useQuestionPool();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const flip = useSharedValue(0);
  const slide = useSharedValue(0);
  // Blocks new gestures/taps while a card transition is playing.
  const animating = useRef(false);
  // Fly a little past the edge so the card border never lingers on screen.
  const offscreen = width * 1.1;

  // Memoized so the array identity is stable across renders — the reset
  // effect below keys off it.
  const poolQuestions = pool.questions;
  const questions = useMemo(
    () => filterByTopic(poolQuestions, topic),
    [poolQuestions, topic],
  );
  const total = questions.length;
  const question = questions[index];

  // A fresh pool or topic change always restarts from the first card.
  useEffect(() => {
    setIndex(0);
    setFlipped(false);
    flip.value = 0;
  }, [questions, flip]);

  const canPrev = index > 0;
  const canNext = index < total - 1;

  const setCard = (nextIndex: number) => {
    setIndex(nextIndex);
    setFlipped(false);
    flip.value = 0; // new card always starts on the question side
  };

  const clearAnimating = () => {
    animating.current = false;
  };

  const abortSlide = () => {
    clearAnimating();
    slide.value = withTiming(0, { duration: 200 });
  };

  /** Second half of a swipe: place the new card past the opposite edge, slide it in. */
  const enterFrom = (nextIndex: number, dir: 1 | -1) => {
    setCard(nextIndex);
    slide.value = -dir * offscreen;
    slide.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) }, () => {
      runOnJS(clearAnimating)();
    });
  };

  /** Fly the current card off one edge, then bring the next one in. */
  const slideToCard = (nextIndex: number, dir: 1 | -1) => {
    animating.current = true;
    slide.value = withTiming(
      dir * offscreen,
      { duration: 240, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(enterFrom)(nextIndex, dir);
        else runOnJS(abortSlide)();
      },
    );
  };

  /** Returns true when the move starts, so a swipe knows not to snap back. */
  const tryNext = () => {
    if (!canNext || animating.current) return false;
    if (reduceMotion) {
      setCard(index + 1);
      return true;
    }
    slideToCard(index + 1, -1);
    return true;
  };

  const tryPrev = () => {
    if (!canPrev || animating.current) return false;
    if (reduceMotion) {
      setCard(index - 1);
      return true;
    }
    slideToCard(index - 1, 1);
    return true;
  };

  /** Second half of the spin: swap content while edge-on, finish rotating to the front. */
  const revealNextFront = (nextIndex: number) => {
    setIndex(nextIndex);
    setFlipped(false);
    flip.value = -90; // 270° and -90° are the same edge-on pose, so the spin stays forward
    flip.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) }, () => {
      runOnJS(clearAnimating)();
    });
  };

  /** "Review again" = self-reported miss: record it, then advance as usual. */
  const reviewAgain = () => {
    if (question && session.user?.id) {
      void addMistake(session.user.id, question.id);
    }
    spinToNext();
  };

  /** "Got it" / "Review again": keep the card spinning onward into the next question. */
  const spinToNext = () => {
    if (!canNext || animating.current) return;
    if (reduceMotion) {
      setCard(index + 1);
      return;
    }
    animating.current = true;
    flip.value = withTiming(270, { duration: 280, easing: Easing.in(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(revealNextFront)(index + 1);
      else runOnJS(clearAnimating)();
    });
  };

  const toggleFlip = () => {
    if (animating.current) return;
    const next = !flipped;
    setFlipped(next);
    flip.value = withTiming(next ? 180 : 0, {
      duration: reduceMotion ? 0 : 450,
      easing: Easing.inOut(Easing.cubic),
    });
  };

  // PanResponder reads handlers through refs so the once-created responder
  // never calls stale closures.
  const actionsRef = useRef({ tryNext, tryPrev });
  actionsRef.current = { tryNext, tryPrev };

  const panResponder = useRef(
    PanResponder.create({
      // Claim the gesture only for a clearly horizontal drag, so taps still
      // reach the card (flip) and its inner buttons.
      onMoveShouldSetPanResponderCapture: (_evt, gesture) =>
        !animating.current &&
        Math.abs(gesture.dx) > 16 &&
        Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderMove: (_evt, gesture) => {
        if (!animating.current) slide.value = gesture.dx;
      },
      onPanResponderRelease: (_evt, gesture) => {
        let handled = false;
        if (gesture.dx < -SWIPE_THRESHOLD) handled = actionsRef.current.tryNext();
        else if (gesture.dx > SWIPE_THRESHOLD) handled = actionsRef.current.tryPrev();
        if (!handled) slide.value = withTiming(0, { duration: 200 });
      },
      onPanResponderTerminate: () => {
        if (!animating.current) slide.value = withTiming(0, { duration: 200 });
      },
    }),
  ).current;

  const slideStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: slide.value },
      // Slight tilt while dragging/flying, like a physical card.
      { rotateZ: `${(slide.value / offscreen) * 5}deg` },
    ],
  }));
  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${flip.value}deg` }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${flip.value - 180}deg` }],
  }));

  const answerText = question
    ? (question.correctIndices?.length ? question.correctIndices : [question.correctIndex])
        .map((i) => question.options[i])
        .filter(Boolean)
        .map((option) => localize(option, lang))
        .join(', ')
    : '';

  return (
    <ScreenContainer padded={false}>
      <View style={styles.body}>
        <ScreenHeader />

        {!question ? (
          <View style={styles.centerFill}>
            <AppText variant="bodyLg" color="muted" center>
              No questions in this topic yet.
            </AppText>
          </View>
        ) : null}

        {question ? (
          <>
            {/* Progress */}
            <View style={styles.progressText}>
              <AppText variant="labelMd" color="muted">
                {t('questionXofY', lang, { current: index + 1, total })}
              </AppText>
              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${((index + 1) / total) * 100}%` }]}
                />
              </View>
            </View>

            {/* Flip card (tap to flip, swipe to change) */}
            <Animated.View style={[styles.cardArea, slideStyle]} {...panResponder.panHandlers}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  flipped ? 'Answer card. Tap to see the question.' : 'Question card. Tap to see the answer.'
                }
                onPress={toggleFlip}
                style={styles.cardPressable}>
                <View style={styles.cardStack}>
                  <Animated.View
                    style={[styles.face, frontStyle]}
                    pointerEvents={flipped ? 'none' : 'auto'}>
                    <View style={styles.faceTopRow}>
                      <SpeakerButton />
                    </View>
                    <View style={styles.faceCenter}>
                      <AppText variant="questionText" color="ink" center>
                        {localize(question.question, lang)}
                      </AppText>
                    </View>
                    <AppText variant="labelMd" color="subtle" center>
                      Tap the card to see the answer
                    </AppText>
                  </Animated.View>

                  <Animated.View
                    style={[styles.face, backStyle]}
                    pointerEvents={flipped ? 'auto' : 'none'}>
                    <View style={styles.faceTopRow}>
                      <SpeakerButton />
                    </View>
                    <View style={styles.faceCenter}>
                      <AppText variant="labelMd" color="muted" center style={styles.answerOverline}>
                        Answer
                      </AppText>
                      <AppText variant="headlineMd" color="navy" center>
                        {answerText}
                      </AppText>
                      <AppText variant="bodyMd" color="muted" center style={styles.explanation}>
                        {localize(question.explanation, lang)}
                      </AppText>
                    </View>
                  </Animated.View>
                </View>
              </Pressable>
            </Animated.View>

            {/* Row 1 — feedback (after flip); both advance to the next card */}
            <View style={styles.feedbackArea}>
              {flipped ? (
                <View style={styles.feedbackRow}>
                  {/* flex sizing must live on wrapper Views: Button's `style`
                      goes to its inner chrome View, not the outer Pressable,
                      so `flex: 1` passed to Button never reaches the row. */}
                  <View style={styles.feedbackButtonWrap}>
                    <Button label={t('gotIt', lang)} onPress={spinToNext} style={styles.feedbackButton} />
                  </View>
                  <View style={styles.feedbackButtonWrap}>
                    <Button
                      label="Review again"
                      variant="secondary"
                      labelColor="red"
                      onPress={reviewAgain}
                      style={[styles.feedbackButton, styles.reviewButton]}
                    />
                  </View>
                </View>
              ) : null}
            </View>

            {/* Row 2 — hint */}
            <AppText variant="labelMd" color="subtle" center style={styles.hint}>
              Swipe or tap the arrows
            </AppText>

            {/* Row 3 — Back / Next arrows */}
            <View style={styles.navRow}>
              <IconButton icon="chevron-left" label="Previous card" onPress={tryPrev} disabled={!canPrev} large />
              <IconButton icon="chevron-right" label="Next card" onPress={tryNext} disabled={!canNext} large />
            </View>
          </>
        ) : null}
      </View>

      <BottomNav />
    </ScreenContainer>
  );
}

/** Placeholder read-aloud control — no real audio yet. */
function SpeakerButton() {
  const lang = useLang();
  return <IconButton icon="volume-up" label={t('readAloud', lang)} onPress={() => {}} />;
}

function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
  large = false,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  large?: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      hitSlop={4}>
      <View
        style={[
          styles.iconButton,
          large && styles.iconButtonLarge,
          pressed && !disabled && styles.iconButtonPressed,
          disabled && styles.iconButtonDisabled,
        ]}>
        <MaterialIcons name={icon} size={large ? 30 : 24} color={Colors.navy} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: Spacing.screenX,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  progressText: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  progressTrack: {
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
    backgroundColor: Colors.navy,
  },
  cardArea: {
    flex: 1,
    // Never collapse under large font settings — the absolute-positioned card
    // faces have no intrinsic height, so a collapsed card spills its content.
    minHeight: 240,
  },
  cardPressable: {
    flex: 1,
  },
  cardStack: {
    flex: 1,
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    backfaceVisibility: 'hidden',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  faceTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  faceCenter: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  answerOverline: {
    textTransform: 'uppercase',
  },
  explanation: {
    paddingTop: Spacing.sm,
  },
  // minHeight (never a fixed height): with large device font settings the
  // labels can wrap and the buttons grow — the row must grow with them and
  // push the rows below down, instead of overflowing onto the arrows.
  feedbackArea: {
    minHeight: Sizing.buttonMin,
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  feedbackRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  feedbackButtonWrap: {
    flex: 1,
  },
  feedbackButton: {
    paddingHorizontal: Spacing.sm,
  },
  reviewButton: {
    borderColor: Colors.red,
  },
  hint: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonLarge: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.navy,
  },
  iconButtonPressed: {
    backgroundColor: Colors.surfaceMuted,
  },
  iconButtonDisabled: {
    opacity: 0.35,
  },
});
