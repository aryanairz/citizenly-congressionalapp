import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppText,
  BottomNav,
  Button,
  FeedbackPanel,
  IconButton,
  LETTERS,
  OfflineNotice,
  OptionCard,
  ScreenContainer,
  ScreenHeader,
  shuffledIndices,
  type OptionVisual,
} from '@/components';
import { Colors, Radius, Spacing } from '@/constants/design';
import { filterByTopic, parseTopicKey } from '@/constants/topics';
import { localize } from '@/lib/i18n';
import { recordMistake } from '@/lib/mistake-queue';
import { useOnboarding } from '@/lib/onboarding-context';
import { useSession } from '@/lib/session-context';
import { useQuestionPool } from '@/lib/use-question-pool';

export default function QuizScreen() {
  const router = useRouter();
  const session = useSession();
  const { data } = useOnboarding();
  const lang = data.languageCode ?? 'en';

  const searchParams = useLocalSearchParams<{ topic?: string }>();
  const topic = parseTopicKey(searchParams.topic);

  const pool = useQuestionPool();
  const [index, setIndex] = useState(0);
  const [round, setRound] = useState(0); // bumps on restart so options reshuffle
  const [order, setOrder] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null); // display position
  const [checked, setChecked] = useState(false); // answer confirmed & graded
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  // Memoized so the array identity is stable across renders — the reset
  // effects below key off it.
  const poolQuestions = pool.status === 'ready' ? pool.questions : null;
  const questions = useMemo(
    () => (poolQuestions ? filterByTopic(poolQuestions, topic) : []),
    [poolQuestions, topic],
  );
  const total = questions.length;
  const question = questions[index];

  // A fresh pool (first load or retry) restarts the quiz from the top.
  useEffect(() => {
    setIndex(0);
    setScore(0);
    setFinished(false);
  }, [questions]);

  // Reshuffle + clear the selection whenever a new question is shown.
  useEffect(() => {
    if (!question) return;
    setOrder(shuffledIndices(question.options.length));
    setSelected(null);
    setChecked(false);
  }, [index, round, questions]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLast = index === total - 1;
  const correctSet = new Set(
    question
      ? question.correctIndices?.length
        ? question.correctIndices
        : [question.correctIndex]
      : [],
  );
  const wasCorrect = checked && selected !== null && correctSet.has(order[selected]);
  const correctAnswerText = question
    ? [...correctSet]
        .map((i) => question.options[i])
        .filter(Boolean)
        .map((option) => localize(option, lang))
        .join(', ')
    : '';

  // Selection is free to change until the user confirms with "Check Answer".
  const handleSelect = (displayIndex: number) => {
    if (checked) return;
    setSelected(displayIndex);
  };

  const handleCheck = () => {
    if (selected === null || checked || !question) return;
    setChecked(true);
    if (correctSet.has(order[selected])) {
      setScore((s) => s + 1);
    } else if (session.user?.id && session.token && !question.id.startsWith('mock-')) {
      // Fire-and-forget: queue locally, flush in the background. Mock ids
      // (offline fallback set) never reach the server.
      recordMistake(session.user.id, session.token, question.id);
    }
  };

  const handleNext = () => {
    if (isLast) setFinished(true);
    else setIndex((i) => i + 1);
  };

  const restart = () => {
    setFinished(false);
    setScore(0);
    setIndex(0);
    setRound((r) => r + 1);
  };

  return (
    <ScreenContainer padded={false}>
      <View style={styles.body}>
        <ScreenHeader />

        {pool.status === 'loading' ? (
          <View style={styles.centerFill}>
            <ActivityIndicator size="large" color={Colors.navy} />
            <AppText variant="bodyLg" color="muted" center>
              Loading questions…
            </AppText>
          </View>
        ) : null}

        {pool.status === 'ready' && !question && !finished ? (
          <View style={styles.centerFill}>
            <AppText variant="bodyLg" color="muted" center>
              No questions in this topic yet.
            </AppText>
          </View>
        ) : null}

        {pool.status === 'ready' && finished ? (
          <View style={styles.centerFill}>
            <AppText variant="headlineLg" color="navy" center>
              Quiz Complete!
            </AppText>
            <AppText variant="bodyLg" color="muted" center>
              You answered {score} of {total} questions correctly.
            </AppText>
            <View style={styles.summaryActions}>
              <Button label="Try Again" onPress={restart} />
              <Button
                label="Back to Home"
                variant="secondary"
                onPress={() => router.replace('/dashboard')}
              />
            </View>
          </View>
        ) : null}

        {pool.status === 'ready' && !finished && question ? (
          <>
            {/* Progress + read-aloud */}
            <View style={styles.progressRow}>
              <View style={styles.progressText}>
                <AppText variant="labelMd" color="muted">
                  Question {index + 1} of {total}
                </AppText>
                <View style={styles.progressTrack}>
                  <View
                    style={[styles.progressFill, { width: `${((index + 1) / total) * 100}%` }]}
                  />
                </View>
                {pool.offline ? <OfflineNotice onRetry={pool.reload} /> : null}
              </View>
              {/* Placeholder read-aloud — no real audio yet. */}
              <IconButton icon="volume-up" label="Read aloud" onPress={() => {}} />
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}>
              <AppText variant="questionText" color="navy" center style={styles.question}>
                {localize(question.question, lang)}
              </AppText>

              <View style={styles.options}>
                {order.map((originalIndex, displayIndex) => {
                  const visual: OptionVisual = !checked
                    ? displayIndex === selected
                      ? 'selected'
                      : 'default'
                    : correctSet.has(originalIndex)
                      ? 'correct'
                      : displayIndex === selected
                        ? 'wrong'
                        : 'dimmed';
                  return (
                    <OptionCard
                      key={originalIndex}
                      letter={LETTERS[displayIndex] ?? '?'}
                      text={localize(question.options[originalIndex], lang)}
                      visual={visual}
                      disabled={checked}
                      onPress={() => handleSelect(displayIndex)}
                    />
                  );
                })}
              </View>

            </ScrollView>

            {checked ? (
              <FeedbackPanel
                correct={wasCorrect}
                correctAnswer={correctAnswerText}
                explanation={localize(question.explanation, lang)}
                nextLabel={isLast ? 'Finish' : 'Next'}
                onNext={handleNext}
              />
            ) : (
              <View style={styles.nextArea}>
                <Button label="Check Answer" onPress={handleCheck} disabled={selected === null} />
              </View>
            )}
          </>
        ) : null}
      </View>

      <BottomNav />
    </ScreenContainer>
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
  summaryActions: {
    alignSelf: 'stretch',
    gap: Spacing.md,
    paddingTop: Spacing.lg,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  progressText: {
    flex: 1,
    gap: Spacing.sm,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: Spacing.md,
    gap: Spacing.lg,
  },
  question: {
    paddingHorizontal: Spacing.sm,
  },
  options: {
    gap: Spacing.md,
  },
  nextArea: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
});
