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

// Split so the two rows never show the same name side by side. px per second.
const MARQUEE_SPLIT = Math.ceil(MARQUEE_LANGUAGE_NAMES.length / 2);
const NAMES_TOP = MARQUEE_LANGUAGE_NAMES.slice(0, MARQUEE_SPLIT);
const NAMES_BOTTOM = MARQUEE_LANGUAGE_NAMES.slice(MARQUEE_SPLIT);
const MARQUEE_SPEED = 26;

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
          <Animated.View
            style={styles.marquee}
            entering={FadeIn.delay(260).duration(600)}
            accessible
            accessibilityLabel={`Available in ${MARQUEE_LANGUAGE_NAMES.length} languages`}>
            <MarqueeRow names={NAMES_TOP} direction="left" />
            <MarqueeRow names={NAMES_BOTTOM} direction="right" />
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

/**
 * One drifting row of language chips.
 *
 * Two of these run against each other. A single row reads as a stray line of
 * text; two moving in opposite directions read as a body of languages, and
 * the opposing motion is what makes it look deliberate rather than stuck.
 */
function MarqueeRow({ names, direction }: { names: string[]; direction: 'left' | 'right' }) {
  const reduceMotion = useReducedMotion();
  const offset = useSharedValue(0);
  // Width of ONE copy of the name set (incl. trailing gap); the loop travels
  // exactly this far, so copy 2 lands where copy 1 started - seamless.
  const [setWidth, setSetWidth] = useState(0);

  useEffect(() => {
    if (reduceMotion || setWidth === 0) return;
    // Leftward runs 0 to -width; rightward starts a set behind and runs back
    // to 0. Either way the travel is one full set, so neither seam shows.
    const from = direction === 'left' ? 0 : -setWidth;
    const to = direction === 'left' ? -setWidth : 0;
    offset.value = from;
    offset.value = withRepeat(
      withTiming(to, {
        // Constant speed regardless of how wide the names render. Slow enough
        // to read a name you recognise before it leaves.
        duration: (setWidth / MARQUEE_SPEED) * 1000,
        easing: Easing.linear,
      }),
      -1,
    );
    return () => cancelAnimation(offset);
  }, [direction, offset, reduceMotion, setWidth]);

  const scrollStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const renderChips = () =>
    names.map((name) => (
      // bodyLg carries zero tracking. The small label variants add positive
      // tracking, which breaks complex-script ligatures (Devanagari,
      // Malayalam, Gujarati).
      <AppText key={name} variant="bodyLg" color="muted">
        {name}
      </AppText>
    ));

  // Fades the page back in over both ends, so chips dissolve at the edges
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
          {renderChips()}
        </ScrollView>
        {edges}
      </View>
    );
  }

  return (
    <View style={styles.marqueeWrap}>
      <Animated.View style={[styles.marqueeTrack, scrollStyle]}>
        <View
          style={styles.marqueeSet}
          onLayout={(e) => setSetWidth(Math.round(e.nativeEvent.layout.width))}>
          {renderChips()}
        </View>
        <View style={styles.marqueeSet}>{renderChips()}</View>
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
  // No background plate. A full-width grey stripe was the only grey on the
  // page, which made it read as a section pasted in rather than part of the
  // screen. The chips carry the tint instead.
  marquee: {
    gap: Spacing.md,
    paddingVertical: Spacing.md,
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
  // Bare words need a wide gap to read as separate names rather than one
  // run-on line.
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
