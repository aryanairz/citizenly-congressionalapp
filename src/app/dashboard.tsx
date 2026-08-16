import { MaterialIcons } from '@expo/vector-icons';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { Fragment, useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText, BottomNav, Card, Divider, ListRow, ScreenContainer } from '@/components';
import { Colors, Radius, Spacing } from '@/constants/design';
import { apiGetMistakes } from '@/lib/api';
import { useOnboarding } from '@/lib/onboarding-context';
import { useSession } from '@/lib/session-context';

const TOTAL_QUESTIONS = 128;

interface Mode {
  icon: keyof typeof MaterialIcons.glyphMap;
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
    icon: 'menu-book',
    title: 'Study Questions',
    description: 'Review the 128 civics questions',
    route: { pathname: '/select-topic', params: { mode: 'study' } } as Href,
  },
  {
    icon: 'style',
    title: 'Flashcards',
    description: 'Practice recall',
    route: { pathname: '/select-topic', params: { mode: 'flashcards' } } as Href,
  },
  {
    icon: 'quiz',
    title: 'Quiz',
    description: 'Practice with multiple choice',
    route: { pathname: '/select-topic', params: { mode: 'quiz' } } as Href,
  },
  {
    icon: 'flag',
    title: 'Review Mistakes',
    description: 'Practice what you missed',
    route: '/review-mistakes' as Href,
  },
  {
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

  // Live mistake count for the Review Mistakes badge; refreshes every time
  // the Dashboard regains focus (e.g. returning from a review session).
  // Failure is graceful: no badge.
  const [mistakeCount, setMistakeCount] = useState<number>(0);
  useFocusEffect(
    useCallback(() => {
      const token = session.token;
      if (!token) return;
      let active = true;
      apiGetMistakes(token)
        .then((ids) => {
          if (active) setMistakeCount(ids.length);
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }, [session.token]),
  );

  const firstName = data.firstName.trim();
  // Placeholder until real progress tracking is wired up.
  const mastered = 0;
  const progress = Math.round((mastered / TOTAL_QUESTIONS) * 100);
  const encouragement =
    mastered === 0
      ? 'Ready when you are — let’s begin!'
      : `You’re doing great! ${TOTAL_QUESTIONS - mastered} more to go.`;

  return (
    <ScreenContainer padded={false}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Greeting */}
        <View style={styles.greeting}>
          <AppText variant="headlineLg" color="navy">
            {firstName ? `Hello, ${firstName}.` : 'Hello.'}
          </AppText>
          <AppText variant="bodyLg" color="muted">
            Let&apos;s continue your citizenship journey.
          </AppText>
        </View>

        {/* Progress card — always framed against the 128-question total */}
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
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <AppText variant="labelMd" color="muted">
            {encouragement}
          </AppText>
        </Card>

        {/* Study modes */}
        <View>
          {MODES.map((mode, index) => (
            <Fragment key={mode.title}>
              {index > 0 ? <Divider style={styles.divider} /> : null}
              <ListRow
                title={mode.title}
                subtitle={mode.description}
                badge={
                  mode.title === 'Review Mistakes'
                    ? mistakeCount > 0
                      ? String(mistakeCount)
                      : undefined
                    : mode.badge
                }
                left={<ModeIcon icon={mode.icon} emphasized={mode.emphasized} />}
                onPress={mode.route ? () => router.push(mode.route!) : () => {}}
              />
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
