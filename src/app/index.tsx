import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { PressableSurface } from '@/components/pressable-surface';
import { ScreenContainer } from '@/components/screen-container';
import { MARQUEE_LANGUAGE_NAMES } from '@/constants/brand';
import { Colors, FontFamily, Radius, Spacing, TabularNums } from '@/constants/design';
import { OFFICIAL_QUESTIONS } from '@/data/question-bank';
import { useSession } from '@/lib/session-context';
import { t } from '@/lib/ui-i18n';
import { useLang } from '@/lib/use-lang';

// Transparent wordmark: the previous asset was a social-share image with a
// white plate baked in, which showed as a pale rectangle on any background
// that was not pure white.
const wordmark = require('@/assets/images/citizenly-wordmark.png');

// Both halves of the headline need identical metrics, because the accent half
// is a nested Text and would otherwise fall back to the body size.
const TITLE_FACE = {
  fontFamily: FontFamily.bold,
  fontSize: 38,
  lineHeight: 43,
  letterSpacing: -1.3,
} as const;

// The headline promises a path, so the page shows the path. Three steps is
// the whole product, and naming them is more honest than a feature grid.
const STEPS = [
  {
    title: 'Pick your language',
    detail: `${MARQUEE_LANGUAGE_NAMES.length} to choose from.`,
  },
  {
    title: `Study all ${OFFICIAL_QUESTIONS.length} questions`,
    detail: 'Flashcards, quizzes, mock interview.',
  },
  {
    title: 'Walk in ready',
    detail: 'Know every answer on interview day.',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const session = useSession();
  const lang = useLang();

  // Hold while the stored session restores; skip Welcome when signed in.
  if (session.status === 'restoring') {
    return null;
  }
  if (session.status === 'signedIn') {
    return <Redirect href="/dashboard" />;
  }

  return (
    <ScreenContainer padded={false}>
      {/* Scrolls only when it has to: the layout is sized for a phone, and
          growing text or a short screen should push content rather than
          clip it. */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        <View style={styles.main}>
          {/* Left-aligned, not centred. Centring every element is what made
              this screen read as a splash rather than a product, and a left
              edge gives the eye one place to start each line. */}
          <Animated.View style={styles.hero} entering={FadeInDown.duration(380)}>
            <Image
              source={wordmark}
              style={styles.wordmark}
              contentFit="contain"
              accessibilityLabel="Citizenly"
            />
            {/* Navy sentence, red close - the same split the wordmark makes,
                so the headline belongs to the logo above it. */}
            <AppText style={styles.title}>
              {'Your path to citizenship\n'}
              <AppText style={styles.titleAccent}>starts here.</AppText>
            </AppText>
            <AppText variant="bodyLg" color="muted" style={styles.subtitle}>
              Practice the official U.S. civics test in your own language.
            </AppText>
          </Animated.View>

          {/* Sits directly under "in your own language" and answers it: the
              names drift past, fading in and out of the page. */}
          <Animated.View entering={FadeIn.delay(300).duration(600)}>
            <LanguageMarquee />
          </Animated.View>

          <Animated.View style={styles.steps} entering={FadeInDown.delay(160).duration(460)}>
            {STEPS.map((step, index) => (
              <Step
                key={step.title}
                number={index + 1}
                title={step.title}
                detail={step.detail}
                last={index === STEPS.length - 1}
              />
            ))}
          </Animated.View>
        </View>

        <Animated.View style={styles.actions} entering={FadeInDown.delay(220).duration(420)}>
          <Button
            label={t('getStarted', lang)}
            onPress={() => router.push('/sign-up')}
            rightIcon={<MaterialIcons name="arrow-forward" size={22} color={Colors.onNavy} />}
          />
          {/* A text link, not a second outlined button. Two buttons of equal
              weight make the user choose twice; one action and one quiet way
              back makes the primary path obvious. */}
          <PressableSurface
            accessibilityRole="link"
            onPress={() => router.push('/log-in')}
            weight="control"
            style={styles.loginLinkTarget}>
            <AppText variant="labelLg" color="navy" center>
              {t('alreadyHaveAccount', lang)}
            </AppText>
          </PressableSurface>
        </Animated.View>
      </ScrollView>
    </ScreenContainer>
  );
}

/**
 * One numbered stop on the path. The rail down the left side is what makes
 * three separate rows read as one route; the last step ends it rather than
 * trailing off.
 */
function Step({
  number,
  title,
  detail,
  last,
}: {
  number: number;
  title: string;
  detail: string;
  last: boolean;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.stepRail}>
        <View style={styles.stepTile}>
          <AppText variant="labelLg" color="navy" style={[styles.stepNumber, TabularNums]}>
            {number}
          </AppText>
        </View>
        {last ? null : <View style={styles.stepLine} />}
      </View>
      <View style={styles.stepText}>
        <AppText variant="labelLg" color="navy">
          {title}
        </AppText>
        <AppText variant="bodyMd" color="muted">
          {detail}
        </AppText>
      </View>
    </View>
  );
}

/** Slow, seamless infinite loop of every platform language in native script. */
function LanguageMarquee() {
  const reduceMotion = useReducedMotion();
  const offset = useSharedValue(0);
  // Width of ONE copy of the name set (incl. trailing gap); the loop translates
  // by exactly this amount, so copy 2 lands where copy 1 started - seamless.
  const [setWidth, setSetWidth] = useState(0);

  useEffect(() => {
    if (reduceMotion || setWidth === 0) return;
    offset.value = 0;
    offset.value = withRepeat(
      withTiming(-setWidth, {
        // Constant speed (~60 px/s) regardless of how wide the names render.
        duration: (setWidth / 60) * 1000,
        easing: Easing.linear,
      }),
      -1,
    );
    return () => cancelAnimation(offset);
  }, [offset, reduceMotion, setWidth]);

  const scrollStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const renderNames = () =>
    MARQUEE_LANGUAGE_NAMES.map((name) => (
      // No letter-spacing: tracking can break complex-script ligatures
      // (Devanagari, Malayalam, Gujarati).
      <AppText key={name} variant="bodyMd" color="subtle">
        {name}
      </AppText>
    ));

  // Fades the page back in over both ends, so names dissolve at the edges
  // instead of being guillotined mid-glyph.
  const edges = (
    <>
      <LinearGradient
        colors={[Colors.white, FADE_OUT_WHITE]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.marqueeEdge, styles.marqueeEdgeLeft]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[FADE_OUT_WHITE, Colors.white]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.marqueeEdge, styles.marqueeEdgeRight]}
        pointerEvents="none"
      />
    </>
  );

  // Respect "reduce motion": a static, finger-scrollable row instead of animation.
  if (reduceMotion) {
    return (
      <View style={styles.marqueeWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.marqueeSet, styles.marqueeStaticPad]}>
          {renderNames()}
        </ScrollView>
        {edges}
      </View>
    );
  }

  return (
    <View
      style={styles.marqueeWrap}
      accessible
      accessibilityLabel={`Available in ${MARQUEE_LANGUAGE_NAMES.length} languages`}>
      <Animated.View style={[styles.marqueeTrack, scrollStyle]}>
        <View
          style={styles.marqueeSet}
          onLayout={(e) => setSetWidth(Math.round(e.nativeEvent.layout.width))}>
          {renderNames()}
        </View>
        <View style={styles.marqueeSet}>{renderNames()}</View>
      </Animated.View>
      {edges}
    </View>
  );
}

// White at zero alpha. Fading to `transparent` goes through black on some
// engines and leaves a dirty smear at the edge.
const FADE_OUT_WHITE = 'rgba(255,255,255,0)';

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
  },
  main: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingHorizontal: Spacing.screenX,
    paddingTop: Spacing.lg,
  },
  hero: {
    gap: Spacing.md,
  },
  wordmark: {
    width: 150,
    // Matches the asset's own 2172x724 proportions, so it never letterboxes.
    aspectRatio: 2172 / 724,
    marginBottom: Spacing.xs,
  },
  title: {
    // Outside the scale on purpose: this is the largest thing in the app and
    // it earns a size of its own.
    ...TITLE_FACE,
    color: Colors.navy,
  },
  titleAccent: {
    ...TITLE_FACE,
    color: Colors.red,
  },
  subtitle: {
    maxWidth: 340,
  },
  steps: {
    // Full width: every detail line should clear on one line, so the three
    // steps keep an even rhythm down the rail.
    paddingRight: 0,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  // Not stretched: the rail's own height sets the spacing between steps, so
  // a long detail line can never pull the numbers apart.
  stepRail: {
    alignItems: 'center',
  },
  stepTile: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.navyTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    letterSpacing: 0,
  },
  stepLine: {
    width: 2,
    height: 30,
    marginVertical: Spacing.xs,
    borderRadius: 1,
    backgroundColor: Colors.border,
  },
  stepText: {
    flex: 1,
    gap: 2,
    // Optical, not mathematical: lines up the title's cap height with the
    // centre of the tile beside it.
    paddingTop: 5,
  },
  actions: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.screenX,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  loginLinkTarget: {
    minHeight: 48,
    justifyContent: 'center',
  },
  // Bleeds past the side padding so the loop runs edge to edge.
  marqueeWrap: {
    marginHorizontal: -Spacing.screenX,
    overflow: 'hidden',
  },
  // Width hugs its content (two copies of the set) instead of stretching.
  marqueeTrack: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
  },
  marqueeSet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
    paddingRight: Spacing.xl,
  },
  marqueeStaticPad: {
    paddingLeft: Spacing.screenX,
  },
  marqueeEdge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 56,
  },
  marqueeEdgeLeft: {
    left: 0,
  },
  marqueeEdgeRight: {
    right: 0,
  },
});
