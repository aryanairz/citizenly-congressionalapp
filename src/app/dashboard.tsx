import { MaterialIcons } from '@expo/vector-icons';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { Fragment, useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  AppText,
  BottomNav,
  Card,
  Divider,
  ListRow,
  ProgressBar,
  ScreenContainer,
} from '@/components';
import { Colors, Radius, Spacing } from '@/constants/design';
import { TOTAL_OFFICIAL as TOTAL_QUESTIONS } from '@/data/question-bank';
import { useMistakes } from '@/lib/local-mistakes';
import { useOnboarding } from '@/lib/onboarding-context';
import { useSession } from '@/lib/session-context';
import { t } from '@/lib/ui-i18n';
import type { UiKey } from '@/lib/ui-strings';
import { useLang } from '@/lib/use-lang';

interface Mode {
  /** Stable identifier - never derive logic or React keys from display text. */
  id: 'study' | 'flashcards' | 'quiz' | 'review-mistakes' | 'mock-interview';
  icon: keyof typeof MaterialIcons.glyphMap;
  /** Translation key when the title has one; `title` is the English fallback. */
  titleKey?: UiKey;
  title: string;
  description: string;
  badge?: string;
  /** Filled navy icon circle instead of the tinted one. */
  emphasized?: boolean;
  /** Destination route; rows without one are placeholders for now. */
  route?: Href;
}

// Study modes go through the shared topic picker first (mock interview has
// its own fixed 10-question script and skips it).
const MODES: Mode[] = [
  {
    id: 'study',
    icon: 'menu-book',
    titleKey: 'modeStudy',
    title: 'Study Questions',
    description: 'Review the 128 civics questions',
    route: { pathname: '/select-topic', params: { mode: 'study' } } as Href,
  },
  {
    id: 'flashcards',
    icon: 'style',
    titleKey: 'modeFlashcards',
    title: 'Flashcards',
    description: 'Practice recall',
    route: { pathname: '/select-topic', params: { mode: 'flashcards' } } as Href,
  },
  {
    id: 'quiz',
    icon: 'quiz',
    titleKey: 'modeQuiz',
    title: 'Quiz',
    description: 'Practice with multiple choice',
    route: { pathname: '/select-topic', params: { mode: 'quiz' } } as Href,
  },
  {
    id: 'review-mistakes',
    icon: 'flag',
    titleKey: 'modeReviewMistakes',
    title: 'Review Mistakes',
    description: 'Practice what you missed',
    route: '/review-mistakes' as Href,
  },
  {
    id: 'mock-interview',
    icon: 'mic',
    title: 'Mock Interview',
    description: 'Simulate the real test',
    badge: 'PRO',
    emphasized: true,
    route: '/mock-interview',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const session = useSession();
  const { data } = useOnboarding();
  const lang = useLang();

  // Live mistake count for the Review Mistakes badge. The store notifies on
  // every change, and refocusing the Dashboard re-reads it too.
  const { ids: mistakeIds, refresh: refreshMistakes } = useMistakes(session.user?.id);
  const mistakeCount = mistakeIds.length;
  useFocusEffect(
    useCallback(() => {
      refreshMistakes();
    }, [refreshMistakes]),
  );

  const firstName = data.firstName.trim();
  // Placeholder until real progress tracking is wired up.
  const mastered = 0;
  const progress = Math.round((mastered / TOTAL_QUESTIONS) * 100);
  const encouragement =
    mastered === 0
      ? 'Ready when you are. Let’s begin.'
      : `Going well. ${TOTAL_QUESTIONS - mastered} more to go.`;

  return (
    <ScreenContainer padded={false}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Greeting */}
        <View style={styles.greeting}>
          <AppText variant="display" color="navy">
            {firstName ? `Hello, ${firstName}.` : 'Hello.'}
          </AppText>
          <AppText variant="bodyLg" color="muted">
            Let&apos;s continue your citizenship journey.
          </AppText>
        </View>

        {/* Progress card - always framed against the 128-question total */}
        <Card surface="muted" style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <AppText variant="labelLg" color="navy">
              Questions Mastered
            </AppText>
            <AppText variant="headlineMd" color="navy">
              {mastered}{' '}
              <AppText variant="labelMd" color="muted">
                / {TOTAL_QUESTIONS}
              </AppText>
            </AppText>
          </View>
          <ProgressBar percent={progress} />
          <AppText variant="labelMd" color="muted">
            {encouragement}
          </AppText>
        </Card>

        {/* Study modes. Each row arrives just after the one above it, so the
            list assembles in reading order instead of appearing all at once. */}
        <View>
          {MODES.map((mode, index) => (
            <Fragment key={mode.id}>
              {index > 0 ? <Divider style={styles.divider} /> : null}
              <Animated.View entering={FadeInDown.delay(index * 45).duration(260)}>
              <ListRow
                title={mode.titleKey ? t(mode.titleKey, lang) : mode.title}
                subtitle={mode.description}
                badge={
                  mode.id === 'review-mistakes'
                    ? mistakeCount > 0
                      ? String(mistakeCount)
                      : undefined
                    : mode.badge
                }
                left={<ModeIcon icon={mode.icon} emphasized={mode.emphasized} />}
                onPress={mode.route ? () => router.push(mode.route!) : () => {}}
              />
              </Animated.View>
            </Fragment>
          ))}
        </View>
      </ScrollView>

      <BottomNav active="home" />
    </ScreenContainer>
  );
}

function ModeIcon({
  icon,
  emphasized = false,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  emphasized?: boolean;
}) {
  return (
    <View style={[styles.modeIcon, emphasized && styles.modeIconEmphasized]}>
      <MaterialIcons name={icon} size={24} color={emphasized ? Colors.onNavy : Colors.navy} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.screenX,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.xl,
  },
  greeting: {
    gap: Spacing.xs,
  },
  progressCard: {
    gap: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: Spacing.md,
  },
  divider: {
    marginVertical: Spacing.xs,
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.navyTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconEmphasized: {
    backgroundColor: Colors.navy,
  },
});
