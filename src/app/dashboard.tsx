import { MaterialIcons } from '@expo/vector-icons';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  AppText,
  BottomNav,
  PressableSurface,
  ProgressBar,
  ScreenContainer,
} from '@/components';
import { Colors, Elevation, FontFamily, Radius, Sizing, Spacing } from '@/constants/design';
import { TOTAL_OFFICIAL as TOTAL_QUESTIONS } from '@/data/question-bank';
import { useMastery } from '@/lib/local-mastery';
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
  const { ids: masteredIds, refresh: refreshMastery } = useMastery(session.user?.id);
  const mistakeCount = mistakeIds.length;
  useFocusEffect(
    useCallback(() => {
      refreshMistakes();
      refreshMastery();
    }, [refreshMistakes, refreshMastery]),
  );

  const firstName = data.firstName.trim();
  // Every mode writes here: a right answer in Quiz, "Got it" in Flashcards, a
  // resolved question in Review Mistakes, a correct answer in the Mock
  // Interview. Capped because a personalised pool holds 129 questions (the
  // senators question splits in two) against an official total of 128, and a
  // figure reading 129/128 would be worse than slightly conservative.
  // Anything still sitting in the mistake bank is not mastered, whatever the
  // mastery set says. A question answered right in Quiz is added here but
  // only leaves the bank by being resolved in Review Mistakes, so without
  // this subtraction the figure would count questions the user is on record
  // as getting wrong.
  const mastered = Math.min(
    masteredIds.filter((id) => !mistakeIds.includes(id)).length,
    TOTAL_QUESTIONS,
  );
  const remaining = TOTAL_QUESTIONS - mastered;
  const progress = Math.round((mastered / TOTAL_QUESTIONS) * 100);
  const encouragement =
    mastered === 0
      ? 'Ready when you are. Let’s begin.'
      : remaining === 0
        ? 'Every question answered right at least once. You are ready.'
        : `Going well. ${remaining} more to go.`;

  return (
    <ScreenContainer padded={false}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Greeting */}
        <Animated.View style={styles.greeting} entering={FadeInDown.duration(320)}>
          <AppText variant="display" color="navy">
            {firstName ? `Hello, ${firstName}.` : 'Hello.'}
          </AppText>
          <AppText variant="bodyLg" color="muted">
            Let&apos;s continue your citizenship journey.
          </AppText>
        </Animated.View>

        {/* Progress, as the anchor of the screen rather than a grey strip.
            Filling it navy makes the one number that measures the user the
            most prominent thing here, and gives the page a centre of gravity
            that a list of equal-weight rows never had. */}
        <Animated.View entering={FadeInDown.delay(60).duration(320)}>
          <View style={[styles.progressCard, Elevation.raised]}>
            <AppText variant="labelMd" color="onNavy" style={styles.progressLabel}>
              Questions mastered
            </AppText>
            <View style={styles.progressFigure}>
              <AppText style={styles.progressNumber}>{mastered}</AppText>
              <AppText variant="headlineMd" style={styles.progressTotal}>
                / {TOTAL_QUESTIONS}
              </AppText>
            </View>
            <ProgressBar percent={progress} trackColor="rgba(255,255,255,0.22)" fillColor={Colors.white} />
            <AppText variant="bodyMd" style={styles.progressNote}>
              {encouragement}
            </AppText>
          </View>
        </Animated.View>

        {/* Modes as separate cards rather than one divided list. Dividers say
            "rows of a table"; separate surfaces say "five things you can
            choose", which is what this actually is. */}
        <View style={styles.modes}>
          <AppText variant="labelMd" color="subtle" style={styles.sectionLabel}>
            Practice
          </AppText>
          {MODES.map((mode, index) => (
            <Animated.View
              key={mode.id}
              entering={FadeInDown.delay(120 + index * 45).duration(280)}>
              <ModeCard
                title={mode.titleKey ? t(mode.titleKey, lang) : mode.title}
                description={mode.description}
                icon={mode.icon}
                emphasized={mode.emphasized}
                badge={
                  mode.id === 'review-mistakes'
                    ? mistakeCount > 0
                      ? String(mistakeCount)
                      : undefined
                    : mode.badge
                }
                onPress={mode.route ? () => router.push(mode.route!) : undefined}
              />
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <BottomNav active="home" />
    </ScreenContainer>
  );
}

/**
 * One study mode as its own surface: icon tile, title, description, chevron.
 * The emphasised variant fills its tile navy, which is how Mock Interview
 * reads as the flagship without needing a different card shape.
 */
function ModeCard({
  title,
  description,
  icon,
  badge,
  emphasized = false,
  onPress,
}: {
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  badge?: string;
  emphasized?: boolean;
  onPress?: () => void;
}) {
  return (
    <PressableSurface
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      disabled={!onPress}
      onPress={onPress}
      weight="surface">
      <View style={[styles.modeCard, Elevation.card]}>
        <View style={[styles.modeIcon, emphasized && styles.modeIconEmphasized]}>
          <MaterialIcons name={icon} size={24} color={emphasized ? Colors.onNavy : Colors.navy} />
        </View>
        <View style={styles.modeText}>
          <View style={styles.modeTitleRow}>
            <AppText variant="labelLg" color="navy">
              {title}
            </AppText>
            {badge ? (
              <View style={styles.badge}>
                <AppText variant="labelMd" color="white" style={styles.badgeText}>
                  {badge}
                </AppText>
              </View>
            ) : null}
          </View>
          <AppText variant="bodyMd" color="muted">
            {description}
          </AppText>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={Colors.subtle} />
      </View>
    </PressableSurface>
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
    backgroundColor: Colors.navy,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  progressLabel: {
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  progressFigure: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  progressNumber: {
    // Deliberately outside the type scale: this is the one number on the
    // screen that measures the user, so it is sized as a figure, not as text.
    fontFamily: FontFamily.bold,
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: -1.6,
    color: Colors.onNavy,
  },
  progressTotal: {
    color: Colors.onNavy,
    opacity: 0.55,
  },
  progressNote: {
    color: Colors.onNavy,
    opacity: 0.75,
  },
  modes: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    paddingBottom: Spacing.xs,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: Sizing.rowMin,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.xl,
    backgroundColor: Colors.white,
  },
  modeText: {
    flex: 1,
    gap: 2,
  },
  modeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  badge: {
    backgroundColor: Colors.red,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.4,
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.navyTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconEmphasized: {
    backgroundColor: Colors.navy,
  },
});
