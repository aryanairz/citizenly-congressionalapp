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
import { Colors, FontFamily, Spacing } from '@/constants/design';
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

/**
 * Welcome.
 *
 * One screen, one job: say what this is and start. It used to pitch three
 * times over - a sample question, a row of figures, a numbered feature list -
 * which is the thing welcome screens are repeatedly told not to do. All of it
 * is gone. What remains is the name, the promise, one band of evidence and
 * one button.
 */
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
        {/* Hero at the top, band at the bottom, air in between. The empty
            middle is the design, not a gap waiting to be filled. */}
        <View style={styles.main}>
          {/* Left-aligned, not centred. Centring everything is what made this
              read as a splash screen, and a left edge gives the eye one place
              to start each line. */}
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

          {/* The one thing on this screen that is not type on white. It is
              also the only claim left, and it proves itself: the names of
              every language the app speaks, drifting past in their own
              scripts. Telling someone "48 languages" is a number; showing
              them their own alphabet is the product. */}
          <Animated.View style={styles.band} entering={FadeIn.delay(260).duration(600)}>
            <LanguageMarquee />
          </Animated.View>
        </View>

        <Animated.View style={styles.actions} entering={FadeInDown.delay(180).duration(420)}>
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
        // Constant speed (~45 px/s) regardless of how wide the names render.
        // Slow enough to read a name you recognise before it leaves.
        duration: (setWidth / 45) * 1000,
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
      <AppText key={name} variant="bodyLg" color="muted">
        {name}
      </AppText>
    ));

  // Fades the band colour back in over both ends, so names dissolve at the
  // edges instead of being guillotined mid-glyph.
  const edges = (
    <>
      <LinearGradient
        colors={[Colors.surfaceMuted, FADE_OUT_TINT]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.marqueeEdge, styles.marqueeEdgeLeft]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[FADE_OUT_TINT, Colors.surfaceMuted]}
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

// `surfaceMuted` at zero alpha. Fading to `transparent` goes through black on
// some engines and leaves a dirty smear at the edge.
const FADE_OUT_TINT = 'rgba(244,246,250,0)';

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
  },
  main: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: Spacing.xl,
  },
  hero: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.screenX,
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
  // Full bleed, edge to edge: one horizontal line across the screen that
  // separates the promise above from the action below.
  band: {
    backgroundColor: Colors.surfaceMuted,
    paddingVertical: Spacing.lg,
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
  marqueeWrap: {
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
    width: 64,
  },
  marqueeEdgeLeft: {
    left: 0,
  },
  marqueeEdgeRight: {
    right: 0,
  },
});
