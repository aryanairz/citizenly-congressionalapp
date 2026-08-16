import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  BottomNav,
  Divider,
  IconButton,
  OfflineNotice,
  ScreenContainer,
  ScreenHeader,
} from '@/components';
import { Colors, Radius, Spacing } from '@/constants/design';
import { filterByTopic, parseTopicKey, topicLabel } from '@/constants/topics';
import type { Question } from '@/lib/api';
import { correctAnswerText, localize } from '@/lib/i18n';
import { useOnboarding } from '@/lib/onboarding-context';
import { useQuestionPool } from '@/lib/use-question-pool';

/**
 * Study Questions browser: every question in the chosen topic as a large card;
 * tapping a card expands it inline to show the answer and explanation — no
 * extra navigation depth, one question open at a time.
 */
export default function StudyListScreen() {
  const router = useRouter();
  const { data } = useOnboarding();
  const lang = data.languageCode ?? 'en';
  const params = useLocalSearchParams<{ topic?: string }>();
  const topic = parseTopicKey(params.topic);

  const pool = useQuestionPool();
  const poolQuestions = pool.status === 'ready' ? pool.questions : null;
  const questions = useMemo(
    () => (poolQuestions ? filterByTopic(poolQuestions, topic) : []),
    [poolQuestions, topic],
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <ScreenContainer padded={false}>
      <View style={styles.body}>
        <ScreenHeader />
        <View style={styles.headingGroup}>
          <AppText variant="headlineLg" color="navy">
            {topicLabel(topic)}
          </AppText>
          {pool.status === 'ready' ? (
            <AppText variant="labelMd" color="muted">
              {questions.length} questions · tap a question to see the answer
            </AppText>
          ) : null}
          {pool.status === 'ready' && pool.offline ? (
            <OfflineNotice onRetry={pool.reload} />
          ) : null}
        </View>

        {pool.status === 'loading' ? (
          <View style={styles.centerFill}>
            <ActivityIndicator size="large" color={Colors.navy} />
            <AppText variant="bodyLg" color="muted" center>
              Loading questions…
            </AppText>
          </View>
        ) : questions.length === 0 ? (
          <View style={styles.centerFill}>
            <AppText variant="bodyLg" color="muted" center>
              No questions in this topic yet.
            </AppText>
          </View>
        ) : (
          <FlatList
            data={questions}
            keyExtractor={(question) => question.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <QuestionCard
                question={item}
                number={index + 1}
                lang={lang}
                expanded={expandedId === item.id}
                onToggle={() =>
                  setExpandedId((current) => (current === item.id ? null : item.id))
                }
              />
            )}
          />
        )}
      </View>

      <BottomNav />
    </ScreenContainer>
  );
}

function QuestionCard({
  question,
  number,
  lang,
  expanded,
  onToggle,
}: {
  question: Question;
  number: number;
  lang: Parameters<typeof localize>[1];
  expanded: boolean;
  onToggle: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      onPress={onToggle}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}>
      <View style={[styles.card, expanded && styles.cardExpanded, pressed && styles.cardPressed]}>
        <View style={styles.cardHeader}>
          <View style={styles.numberChip}>
            <AppText variant="labelMd" color="navy" style={styles.numberText}>
              {number}
            </AppText>
          </View>
          <AppText variant="questionText" color="ink" style={styles.questionText}>
            {localize(question.question, lang)}
          </AppText>
          <MaterialIcons
            name={expanded ? 'expand-less' : 'expand-more'}
            size={28}
            color={Colors.subtle}
          />
        </View>

        {expanded ? (
          <View style={styles.answerBlock}>
            <Divider />
            <View style={styles.answerHeader}>
              <AppText variant="labelMd" color="muted" style={styles.answerOverline}>
                Answer
              </AppText>
              {/* Placeholder read-aloud — no real audio yet. */}
              <IconButton icon="volume-up" label="Read aloud" onPress={() => {}} />
            </View>
            <AppText variant="labelLg" color="navy">
              {correctAnswerText(question, lang)}
            </AppText>
            <AppText variant="bodyMd" color="muted">
              {localize(question.explanation, lang)}
            </AppText>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: Spacing.screenX,
  },
  headingGroup: {
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  list: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  card: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardExpanded: {
    borderColor: Colors.navy,
  },
  cardPressed: {
    backgroundColor: Colors.surfaceMuted,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  numberChip: {
    minWidth: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.navyTint,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  numberText: {
    letterSpacing: 0,
  },
  questionText: {
    flex: 1,
  },
  answerBlock: {
    gap: Spacing.sm,
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  answerOverline: {
    textTransform: 'uppercase',
  },
});
