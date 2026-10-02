import {
  DMSans_400Regular,
  DMSans_600SemiBold,
  DMSans_700Bold,
  useFonts,
} from '@expo-google-fonts/dm-sans';
// expo-router 57 vendored React Navigation and dropped the dependency on it,
// so these come from expo-router now. Same components, same theme object.
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { Colors } from '@/constants/design';
import { OnboardingProvider } from '@/lib/onboarding-context';
import { SessionProvider } from '@/lib/session-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Load the three DM Sans weights the scale uses before revealing the UI, so
  // text never flashes in a fallback font. The 500 Medium face is not loaded:
  // it failed to resolve at runtime and fell through to the serif default.
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
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
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.canvas } }}
          />
        </SessionProvider>
      </OnboardingProvider>
    </ThemeProvider>
  );
}
