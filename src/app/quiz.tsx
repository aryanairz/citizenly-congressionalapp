import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import {
  AppText,
  BottomNav,
  Button,
  FeedbackPanel,
  LETTERS,
  OptionCard,
  ReadAloudButton,
  ScreenContainer,
  ScreenHeader,
  shuffledIndices,
  type OptionVisual,
  ProgressBar,
} from '@/components';
import { Spacing, TabularNums } from '@/constants/design';
import { filterByTopic, parseTopicKey } from '@/constants/topics';
import { localize } from '@/lib/i18n';
import { addMistake } from '@/lib/local-mistakes';
import { speakAuto, stopSpeaking } from '@/lib/speech';
import { t, tCount } from '@/lib/ui-i18n';
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

  // Memoized so the array identity is stable across renders - the reset
  // effects below key off it.
  const poolQuestions = pool.questions;
  const questions = useMemo(
    () => filterByTopic(poolQuestions, topic),
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

  // Never let a voice keep talking after the user has left the screen.
  useEffect(() => stopSpeaking, []);

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
    const right = correctSet.has(order[selected]);
    if (right) {
      setScore((s) => s + 1);
    } else if (session.user?.id) {
      // Enroll it in the local mistake bank; Review Mistakes drains it later.
      void addMistake(session.user.id, question.id);
    }
    // Speak the verdict and the reason, so someone who can't read the
    // feedback panel still gets it. Silent if auto-speak is turned off.
    speakAuto(
      [
        t(right ? 'correctBanner' : 'wrongBanner', lang),
        correctAnswerText,
        localize(question.explanation, lang),
      ].join('. '),
      lang,
    );
  };

  const handleNext = () => {
    stopSpeaking();
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

        {!question && !finished ? (
          <View style={styles.centerFill}>
            <AppText variant="bodyLg" color="muted" center>
              No questions in this topic yet.
            </AppText>
          </View>
        ) : null}

        {finished ? (
          <View style={styles.centerFill}>
            <AppText variant="display" color="navy" center>
              {t('quizComplete', lang)}
            </AppText>
            <AppText variant="bodyLg" color="muted" center>
              {tCount('quizSummary', total, lang, { score, total })}
            </AppText>
            <View style={styles.summaryActions}>
              <Button label={t('tryAgain', lang)} onPress={restart} />
              <Button
                label={t('backToHome', lang)}
                variant="secondary"
                onPress={() => router.replace('/dashboard')}
              />
            </View>
          </View>
        ) : null}

        {!finished && question ? (
          <>
            {/* Position first, then the question. Knowing where you are in the
                set is orienting; it belongs above the question, quietly. */}
            <View style={styles.progressRow}>
              <View style={styles.progressText}>
                <AppText variant="labelMd" color="subtle" style={[styles.counter, TabularNums]}>
                  {t('questionXofY', lang, { current: index + 1, total })}
                </AppText>
                <ProgressBar percent={((index + 1) / total) * 100} />
              </View>
              {/* Reads the question and every option, so the whole screen is
                  usable without reading it. */}
              <ReadAloudButton
                text={[
                  localize(question.question, lang),
                  ...order.map((i) => localize(question.options[i], lang)),
                ].join('. ')}
              />
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}>
              {/* Left-aligned, not centred: centred text makes every line start
                  in a different place, which is exactly the wrong thing to ask
                  of someone reading a second language. The question changes on
                  every card, so it fades in rather than swapping. */}
              <Animated.View key={question.id} entering={FadeIn.duration(220)}>
                <AppText variant="headlineMd" color="navy" style={styles.question}>
                  {localize(question.question, lang)}
                </AppText>
              </Animated.View>

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
                nextLabel={isLast ? 'Finish' : t('next', lang)}
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
    paddingBottom: Spacing.md,
  },
  progressText: {
    flex: 1,
    gap: Spacing.sm,
  },
  counter: {
    textTransform: 'uppercase',
  },
  scroll: {
    flex: 1,
  },
  // flexGrow + centred: with four short options the screen used to pack
  // everything against the top and leave a void above the footer. Letting the
  // group find the middle of its own space removes the void without pinning
  // anything, and long questions still scroll normally.
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.xl,
  },
  question: {
    // Room for the question to breathe; it is the thing being asked.
    paddingRight: Spacing.md,
  },
  options: {
    gap: Spacing.md,
  },
  nextArea: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
});
