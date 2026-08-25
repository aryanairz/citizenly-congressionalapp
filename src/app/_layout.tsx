import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  useFonts,
} from '@expo-google-fonts/dm-sans';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { Colors } from '@/constants/design';
import { OnboardingProvider } from '@/lib/onboarding-context';
import { SessionProvider } from '@/lib/session-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Load DM Sans (all weights the type scale uses) before revealing the UI so
  // text never flashes in a fallback system font.
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Keep the native splash up until fonts resolve (or fail).
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    // The design system is light-only; pin the navigation theme so OS dark
    // mode can't flip chrome colors out from under the white canvas.
    <ThemeProvider value={DefaultTheme}>
      <OnboardingProvider>
        <SessionProvider>
          <Stack
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.white } }}
          />
        </SessionProvider>
      </OnboardingProvider>
    </ThemeProvider>
  );
}
