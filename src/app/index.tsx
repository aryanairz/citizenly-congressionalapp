import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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

const wordmark = require('@/assets/images/og-image.png');

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
            {/* Held to a single line. Measured: at the display size (30px) this
                sentence is 523px wide and the usable width on a 375pt phone is
                327px, so one line forces it down to 18px. `adjustsFontSizeToFit`
                shrinks it further on anything narrower rather than truncating. */}
            <AppText
              variant="display"
              color="navy"
              center
              numberOfLines={1}
              adjustsFontSizeToFit
              style={styles.heroTitle}>
              Your path to citizenship starts here.
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
  hero: {
    alignItems: 'center',
    gap: Spacing.lg,
  },
  heroTitle: {
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  wordmark: {
    width: '100%',
    maxWidth: 320,
    aspectRatio: 1600 / 630,
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
