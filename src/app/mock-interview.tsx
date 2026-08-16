import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AppText, Button, Card, ScreenContainer, ScreenHeader } from '@/components';
import { Colors, Radius, Spacing } from '@/constants/design';

/**
 * Mock Interview — UI-only mock of the premium voice interview flow.
 * No audio is recorded or played and no API is called; every transition is a
 * visual placeholder so the full flow can be reviewed end to end.
 */

type Phase = 'start' | 'asking' | 'listening' | 'result';
type MockResult = 'correct' | 'partial' | 'incorrect';

interface InterviewQuestion {
  question: string;
  answer: string;
}

const QUESTIONS: InterviewQuestion[] = [
  { question: 'What is the supreme law of the land?', answer: 'The Constitution' },
  { question: 'Who is in charge of the executive branch?', answer: 'The President' },
  { question: 'What are the two parts of the US Congress?', answer: 'The Senate and House of Representatives' },
  { question: 'How many US senators are there?', answer: 'One hundred (100)' },
  { question: 'What is the capital of the United States?', answer: 'Washington, D.C.' },
  { question: 'What ocean is on the West Coast of the United States?', answer: 'The Pacific Ocean' },
  { question: 'Who wrote the Declaration of Independence?', answer: 'Thomas Jefferson' },
  { question: 'What do we celebrate on July 4th?', answer: 'Independence Day' },
  { question: 'How many amendments does the Constitution have?', answer: 'Twenty-seven (27)' },
  { question: 'What is the name of the national anthem?', answer: 'The Star-Spangled Banner' },
];
const TOTAL = QUESTIONS.length;

/** Rotates through the three result states so all visuals are reviewable. */
function mockResultFor(index: number): MockResult {
  return (['correct', 'partial', 'incorrect'] as const)[index % 3];
}

function mockTranscriptFor(question: InterviewQuestion, result: MockResult): string {
  const words = question.answer.split(' ');
  switch (result) {
    case 'correct':
      return question.answer;
    case 'partial':
      return `${words.slice(0, Math.ceil(words.length / 2)).join(' ')}… hmm, I forget the rest.`;
    case 'incorrect':
      return "Oh… I'm not sure. I don't remember that one.";
  }
}

const RESULT_META: Record<
  MockResult,
  { label: string; icon: keyof typeof MaterialIcons.glyphMap; color: string; tint: string }
> = {
  correct: { label: 'Correct', icon: 'check-circle', color: Colors.success, tint: Colors.successTint },
  partial: { label: 'Partial', icon: 'error-outline', color: Colors.warning, tint: Colors.warningTint },
  incorrect: { label: 'Incorrect', icon: 'cancel', color: Colors.red, tint: Colors.redTint },
};

export default function MockInterviewScreen() {
  const [phase, setPhase] = useState<Phase>('start');
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);

  const current = QUESTIONS[index];
  const result = mockResultFor(index);
  const isLast = index === TOTAL - 1;

  const startInterview = () => {
    setIndex(0);
    setScore(0);
    setPhase('asking');
  };

  const stopListening = () => {
    if (mockResultFor(index) === 'correct') {
      setScore((s) => s + 1);
    }
    setPhase('result');
  };

  const nextQuestion = () => {
    if (isLast) {
      setPhase('start');
      return;
    }
    setIndex((i) => i + 1);
    setPhase('asking');
  };

  // Score is still tracked (for a future finish summary) but no longer shown
  // on the result screen.
  void score;
  const progressLine = `Question ${index + 1} of ${TOTAL}`;

  return (
    <ScreenContainer
      scroll={phase === 'result'}
      footer={
        phase === 'start' ? (
          <Button label="Start Interview" onPress={startInterview} />
        ) : phase === 'result' ? (
          <Button label={isLast ? 'Finish' : 'Next Question'} onPress={nextQuestion} />
        ) : undefined
      }>
      <ScreenHeader />

      {phase === 'start' ? (
        <View style={styles.startBody}>
          <View style={styles.startCopy}>
            <View style={styles.titleRow}>
              <AppText variant="headlineLg" color="navy" center>
                Mock Interview
              </AppText>
              <View style={styles.proBadge}>
                <AppText variant="labelMd" color="white" style={styles.proBadgeText}>
                  PRO
                </AppText>
              </View>
            </View>
            <AppText variant="bodyLg" color="muted" center>
              Practice out loud with an AI officer that asks real USCIS questions, listens to your
              answer, and gives instant feedback — just like the real interview.
            </AppText>
          </View>
        </View>
      ) : null}

      {phase === 'asking' || phase === 'listening' ? (
        <View style={styles.interviewBody}>
          <View style={styles.questionBlock}>
            <AppText variant="labelMd" color="muted" style={styles.overline}>
              {progressLine}
            </AppText>
            <AppText variant="labelMd" color="muted" style={styles.overline}>
              The officer asks:
            </AppText>
            <AppText variant="headlineLg" color="navy">
              {current.question}
            </AppText>
            {phase === 'asking' ? <SpeakerIndicator /> : null}
          </View>

          <View style={styles.micCluster}>
            <MicButton
              listening={phase === 'listening'}
              onPress={phase === 'asking' ? () => setPhase('listening') : stopListening}
            />
            <AppText variant="labelLg" color="navy" center>
              {phase === 'listening' ? 'Listening…' : 'Tap to answer'}
            </AppText>
          </View>
        </View>
      ) : null}

      {phase === 'result' ? (
        <View style={styles.resultBody}>
          <View
            style={[styles.resultBanner, { backgroundColor: RESULT_META[result].tint, borderColor: RESULT_META[result].color }]}
            accessible
            accessibilityLabel={`Result: ${RESULT_META[result].label}`}>
            <MaterialIcons name={RESULT_META[result].icon} size={36} color={RESULT_META[result].color} />
            <AppText variant="headlineMd" style={{ color: RESULT_META[result].color }}>
              {RESULT_META[result].label}
            </AppText>
          </View>

          <View style={styles.resultSection}>
            <AppText variant="labelLg" color="navy">
              You said
            </AppText>
            <Card>
              <AppText variant="bodyLg" color="ink">
                &ldquo;{mockTranscriptFor(current, result)}&rdquo;
              </AppText>
            </Card>
          </View>

          <View style={styles.resultSection}>
            <AppText variant="labelLg" color="navy">
              Correct answer
            </AppText>
            <Card surface="muted">
              <AppText variant="questionText" color="navy">
                {current.answer}
              </AppText>
            </Card>
          </View>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

/** Placeholder "being read aloud" indicator — no real audio yet. */
function SpeakerIndicator() {
  return (
    <View style={styles.speakerRow}>
      <View style={styles.speakerIcon}>
        <MaterialIcons name="volume-up" size={20} color={Colors.navy} />
      </View>
      <AppText variant="labelMd" color="muted">
        Reading the question aloud…
      </AppText>
    </View>
  );
}

/** Large circular red mic button; pulses with an expanding ring while listening. */
function MicButton({ listening, onPress }: { listening: boolean; onPress: () => void }) {
  const [pressed, setPressed] = useState(false);
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!listening || reduceMotion) return;
    pulse.value = 0;
    pulse.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) }),
      -1,
    );
    return () => cancelAnimation(pulse);
  }, [listening, pulse, reduceMotion]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.6]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.35, 0]),
  }));

  return (
    <View style={styles.micWrap}>
      {listening ? <Animated.View style={[styles.micRing, ringStyle]} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={listening ? 'Stop listening' : 'Tap to answer'}
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}>
        <View style={[styles.mic, pressed && styles.micPressed]}>
          <MaterialIcons name="mic" size={40} color={Colors.white} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // START
  startBody: {
    flex: 1,
    justifyContent: 'center',
  },
  startCopy: {
    gap: Spacing.md,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    // Optically centered: nudged up slightly so the block doesn't sit heavy
    // above the footer button.
    marginBottom: Spacing.xxl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  proBadge: {
    backgroundColor: Colors.red,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  proBadgeText: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.5,
  },
  // ASKING / LISTENING
  interviewBody: {
    flex: 1,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    justifyContent: 'space-between',
  },
  questionBlock: {
    gap: Spacing.sm,
  },
  overline: {
    textTransform: 'uppercase',
  },
  speakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
  },
  speakerIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.navyTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micCluster: {
    alignItems: 'center',
    gap: Spacing.md,
    alignSelf: 'stretch',
    // Lift the mic comfortably off the bottom edge now that Stop is gone.
    paddingBottom: Spacing.xl,
  },
  micWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radius.full,
    backgroundColor: Colors.red,
  },
  mic: {
    width: 96,
    height: 96,
    borderRadius: Radius.full,
    backgroundColor: Colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micPressed: {
    opacity: 0.85,
  },
  // RESULT
  resultBody: {
    gap: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  resultSection: {
    gap: Spacing.sm,
  },
});
