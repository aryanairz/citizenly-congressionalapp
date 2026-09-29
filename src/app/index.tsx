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
import { ScreenContainer } from '@/components/screen-container';
import { MARQUEE_LANGUAGE_NAMES } from '@/constants/brand';
import { Colors, Spacing } from '@/constants/design';
import { useSession } from '@/lib/session-context';
import { t } from '@/lib/ui-i18n';
import { useLang } from '@/lib/use-lang';

// Transparent wordmark: the previous asset was a social-share image with a
// white plate baked in, which showed as a pale rectangle on any background
// that was not pure white.
const wordmark = require('@/assets/images/citizenly-wordmark.png');

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
    <ScreenContainer>
      {/* A very faint navy wash behind the top of the screen. Flat white
          reads as unfinished; this gives the hero something to sit on
          without introducing a second background colour or a hard edge
          anywhere. Radial, not a 45-degree fade, so it has no direction. */}
      <LinearGradient
        colors={['rgba(27,42,74,0.055)', 'rgba(27,42,74,0)']}
        style={styles.ambient}
        pointerEvents="none"
      />
      {/* Wordmark, claim and proof read as one block, centred together in the
          space above the actions. Each part arrives a beat after the one above
          it, so the screen introduces itself in reading order. */}
      <View style={styles.main}>
        <Animated.View style={styles.hero} entering={FadeIn.duration(400)}>
          <Image
            source={wordmark}
            style={styles.wordmark}
            contentFit="contain"
            accessibilityLabel="Citizenly"
          />
          <Animated.View entering={FadeInDown.delay(120).duration(420)}>
            {/* One line AND real presence means the sentence has to be short.
                Measured at 375pt (327px usable): the full sentence only fits
                at 18px, which is body-text size; trimmed to four words it
                holds 28px and reads as a headline again. */}
            <AppText
              variant="display"
              color="navy"
              center
              numberOfLines={1}
              adjustsFontSizeToFit
              style={styles.heroTitle}>
              Your path to citizenship
            </AppText>
          </Animated.View>
        </Animated.View>

        {/* The languages are the proof of the promise above, so they sit
            directly under it rather than stranded at the bottom edge. */}
        <Animated.View style={styles.proof} entering={FadeIn.delay(360).duration(500)}>
          <LanguageMarquee />
          <AppText variant="bodyMd" color="subtle" center>
            {`Available in ${MARQUEE_LANGUAGE_NAMES.length} languages`}
          </AppText>
        </Animated.View>
      </View>

      <Animated.View style={styles.actions} entering={FadeInDown.delay(240).duration(420)}>
        <Button
          label={t('getStarted', lang)}
          onPress={() => router.push('/sign-up')}
          rightIcon={<MaterialIcons name="arrow-forward" size={22} color={Colors.onNavy} />}
        />
        <Button
          label={t('alreadyHaveAccount', lang)}
          variant="secondary"
          onPress={() => router.push('/log-in')}
        />
      </Animated.View>
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
      <AppText key={name} variant="bodyMd" color="muted">
        {name}
      </AppText>
    ));

  // Respect "reduce motion": a static, finger-scrollable row instead of animation.
  if (reduceMotion) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.marquee}
        contentContainerStyle={[styles.marqueeSet, styles.marqueeStaticPad]}>
        {renderNames()}
      </ScrollView>
    );
  }

  return (
    <View
      style={styles.marquee}
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
    </View>
  );
}

const styles = StyleSheet.create({
  ambient: {
    position: 'absolute',
    top: -Spacing.xxl,
    left: -Spacing.screenX,
    right: -Spacing.screenX,
    height: '62%',
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.lg,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.7,
  },
  wordmark: {
    width: '100%',
    maxWidth: 260,
    // Matches the asset's own 2172x724 proportions, so it never letterboxes.
    aspectRatio: 2172 / 724,
  },
  // Takes the leftover height so the message block centres as a unit. The
  // generous internal gap is deliberate: letting the block breathe makes it
  // occupy the screen rather than huddling in the middle of it, which is what
  // removes the sense of empty space above and below.
  main: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.xxl,
  },
  proof: {
    gap: Spacing.md,
  },
  actions: {
    gap: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  // Bleed past the container's 24px side padding so the loop runs edge-to-edge.
  marquee: {
    marginHorizontal: -Spacing.screenX,
    overflow: 'hidden',
    paddingBottom: Spacing.sm,
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
});
