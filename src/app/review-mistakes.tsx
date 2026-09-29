import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppText,
  BottomNav,
  Button,
  FeedbackPanel,
  IconButton,
  LETTERS,
  OptionCard,
  ScreenContainer,
  ScreenHeader,
  shuffledIndices,
  type OptionVisual,
  ProgressBar,
} from '@/components';
import { Colors, Radius, Spacing } from '@/constants/design';
import { confirmAction } from '@/lib/confirm';
import { clearMistakes, removeMistake, useMistakes } from '@/lib/local-mistakes';
import { correctAnswerText, localize } from '@/lib/i18n';
import { useOnboarding } from '@/lib/onboarding-context';
import { useSession } from '@/lib/session-context';
import { t } from '@/lib/ui-i18n';
import { useQuestionPool } from '@/lib/use-question-pool';

/**
 * Review Mistakes: quiz-style review over the device's mistake bank.
 * Answering correctly HERE is the only place a mistake resolves - wrong
 * answers keep the question in the set, so the bank drains as you improve.
 */
export default function ReviewMistakesScreen() {
  const router = useRouter();
  const session = useSession();
  const { data } = useOnboarding();
  const lang = data.languageCode ?? 'en';

  const pool = useQuestionPool();
  const { ids: mistakeIds, loading: mistakesLoading } = useMistakes(session.user?.id);
  const [reloadKey, setReloadKey] = useState(0);

  // Review-session state
  const [index, setIndex] = useState(0);
  const [order, setOrder] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [finished, setFinished] = useState(false);

  // The review pile: mistake ids resolved against the bundled question pool.
  // `reloadKey` restarts the session over whatever is still unresolved.
  const poolQuestions = pool.questions;
  const reviewQuestions = useMemo(() => {
    const byId = new Map(poolQuestions.map((q) => [q.id, q]));
    return mistakeIds.map((id) => byId.get(id)).filter((q) => q !== undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolQuestions, mistakeIds, reloadKey]);

  const total = reviewQuestions?.length ?? 0;
  const question = reviewQuestions?.[index];

  // Fresh pile → restart the session.
  useEffect(() => {
    setIndex(0);
    setResolvedIds(new Set());
    setFinished(false);
  }, [reviewQuestions]);

  // New question → reshuffle, clear grading.
  useEffect(() => {
    if (!question) return;
    setOrder(shuffledIndices(question.options.length));
    setSelected(null);
    setChecked(false);
  }, [index, question]); // eslint-disable-line react-hooks/exhaustive-deps

  const correctSet = new Set(
    question
      ? question.correctIndices?.length
        ? question.correctIndices
        : [question.correctIndex]
      : [],
  );
  const wasCorrect = checked && selected !== null && correctSet.has(order[selected]);
  const isLast = index === total - 1;

  const handleCheck = () => {
    if (selected === null || checked || !question) return;
    setChecked(true);
    if (correctSet.has(order[selected]) && session.user?.id) {
      // Resolved! The only place a mistake leaves the bank.
      setResolvedIds((prev) => new Set(prev).add(question.id));
      void removeMistake(session.user.id, question.id);
    }
  };

  const handleNext = () => {
    if (isLast) setFinished(true);
    else setIndex((i) => i + 1);
  };

  const handleClearAll = () => {
    void confirmAction({
      title: 'Clear all mistakes?',
      message: `This removes all ${total} question${total === 1 ? '' : 's'} from your review list. This cannot be undone.`,
      confirmLabel: 'Clear All',
      destructive: true,
    }).then((confirmed) => {
      if (confirmed && session.user?.id) {
        void clearMistakes(session.user.id);
      }
    });
  };

  const loading = mistakesLoading;
  const resolvedCount = resolvedIds.size;
  const remaining = total - resolvedCount;

  return (
    <ScreenContainer padded={false}>
      <View style={styles.body}>
        <ScreenHeader />

        {loading ? (
          <View style={styles.centerFill}>
            <ActivityIndicator size="large" color={Colors.navy} />
          </View>
        ) : null}

        {!loading && total === 0 ? (
          <View style={styles.centerFill}>
            <View style={styles.emptyBadge}>
              <MaterialIcons name="check-circle" size={44} color={Colors.success} />
            </View>
            <AppText variant="headlineMd" color="navy" center>
              No mistakes to review
            </AppText>
            <AppText variant="bodyLg" color="muted" center>
              Questions you miss in Quiz or mark &ldquo;Review again&rdquo; in Flashcards will
              appear here.
            </AppText>
            <Button label={t('backToHome', lang)} onPress={() => router.replace('/dashboard')} fullWidth={false} />
          </View>
        ) : null}

        {!loading && total > 0 && finished ? (
          <View style={styles.centerFill}>
            <AppText variant="display" color="navy" center>
              Review Complete!
            </AppText>
            <AppText variant="bodyLg" color="muted" center>
              You resolved {resolvedCount} of {total} mistake{total === 1 ? '' : 's'}.
              {remaining > 0 ? ` ${remaining} left to master.` : ' All clear!'}
            </AppText>
            <View style={styles.summaryActions}>
              {remaining > 0 ? (
                <Button
                  label={`Review Remaining (${remaining})`}
                  onPress={() => setReloadKey((k) => k + 1)}
                />
              ) : null}
              <Button
                label={t('backToHome', lang)}
                variant="secondary"
                onPress={() => router.replace('/dashboard')}
              />
            </View>
          </View>
        ) : null}

        {!loading && !finished && question ? (
          <>
            <View style={styles.progressRow}>
              <View style={styles.progressText}>
                <AppText variant="labelMd" color="muted">
                  Reviewing {index + 1} of {total} · {resolvedCount} resolved
                </AppText>
                <ProgressBar percent={((index + 1) / total) * 100} />
              </View>
              <IconButton icon="delete-outline" label="Clear all mistakes" onPress={handleClearAll} />
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
                      onPress={() => {
                        if (!checked) setSelected(displayIndex);
                      }}
                    />
                  );
                })}
              </View>
            </ScrollView>

            {checked ? (
              <FeedbackPanel
                correct={wasCorrect}
                correctAnswer={correctAnswerText(question, lang)}
                explanation={localize(question.explanation, lang)}
                headline={wasCorrect ? 'Resolved!' : 'Still practicing'}
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
  emptyBadge: {
    width: 88,
    height: 88,
    borderRadius: Radius.full,
    backgroundColor: Colors.successTint,
    alignItems: 'center',
    justifyContent: 'center',
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
