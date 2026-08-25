import { MaterialIcons } from '@expo/vector-icons';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, BottomNav, ScreenContainer, ScreenHeader } from '@/components';
import { Colors, Radius, Sizing, Spacing } from '@/constants/design';
import { filterByTopic, TOPIC_OPTIONS, type TopicKey } from '@/constants/topics';
import { t, tCount } from '@/lib/ui-i18n';
import { useLang } from '@/lib/use-lang';
import { useQuestionPool } from '@/lib/use-question-pool';
import type { UiKey } from '@/lib/ui-strings';

type Mode = 'study' | 'flashcards' | 'quiz';

const MODE_META: Record<Mode, { labelKey: UiKey; target: string }> = {
  study: { labelKey: 'modeStudy', target: '/study-list' },
  flashcards: { labelKey: 'modeFlashcards', target: '/flashcards' },
  quiz: { labelKey: 'modeQuiz', target: '/quiz' },
};

/**
 * Shared topic picker for Study Questions, Flashcards, and Quiz. Counts come
 * from the live question pool, so "Your State & Officials" only appears when
 * the user actually has personalized questions.
 */
export default function SelectTopicScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode: Mode =
    params.mode === 'flashcards' || params.mode === 'quiz' ? params.mode : 'study';

  const lang = useLang();
  const pool = useQuestionPool();
  const questions = pool.questions;

  const rows = TOPIC_OPTIONS.map((option) => ({
    ...option,
    count: filterByTopic(questions, option.key).length,
  })).filter((option) => option.count > 0 || option.key === 'all');

  const openTopic = (topic: TopicKey) => {
    router.push({ pathname: MODE_META[mode].target, params: { topic } } as Href);
  };

  return (
    <ScreenContainer padded={false}>
      <View style={styles.body}>
        <ScreenHeader />
        <View style={styles.headingGroup}>
          <AppText variant="labelMd" color="muted" style={styles.modeLabel}>
            {t(MODE_META[mode].labelKey, lang)}
          </AppText>
          <AppText variant="headlineLg" color="navy">
            {t('selectTopic', lang)}
          </AppText>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}>
          {rows.map((topic) => (
            <TopicRow
              key={topic.key}
              name={topic.label}
              count={topic.count}
              onPress={() => openTopic(topic.key)}
            />
          ))}
        </ScrollView>
      </View>

      <BottomNav />
    </ScreenContainer>
  );
}

function TopicRow({ name, count, onPress }: { name: string; count: number; onPress: () => void }) {
  const [pressed, setPressed] = useState(false);
  const lang = useLang();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${tCount('questionsCount', count, lang)}`}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}>
      <View style={[styles.row, pressed && styles.rowPressed]}>
        <AppText variant="labelLg" color="navy" style={styles.rowTitle}>
          {name}
        </AppText>
        <View style={styles.countPill}>
          <AppText variant="labelMd" color="navy" style={styles.countText}>
            {count}
          </AppText>
        </View>
        <MaterialIcons name="chevron-right" size={26} color={Colors.subtle} />
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
    paddingBottom: Spacing.lg,
  },
  modeLabel: {
    textTransform: 'uppercase',
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  scroll: {
    flex: 1,
  },
  list: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: Sizing.rowMin,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
  },
  rowPressed: {
    backgroundColor: Colors.surfaceMuted,
  },
  rowTitle: {
    flex: 1,
  },
  countPill: {
    backgroundColor: Colors.navyTint,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minWidth: 48,
    alignItems: 'center',
  },
  countText: {
    letterSpacing: 0,
  },
});
