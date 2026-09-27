import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, ScreenHeader, StateDistrictPicker, StepDots } from '@/components';
import type { USPlace } from '@/constants/us-states';
import { Spacing } from '@/constants/design';
import { createAccount } from '@/lib/local-account';
import { useOnboarding } from '@/lib/onboarding-context';
import { useSession } from '@/lib/session-context';

export default function StateScreen() {
  const router = useRouter();
  const session = useSession();
  const { data, update } = useOnboarding();
  const [submitting, setSubmitting] = useState(false);
  const [signupError, setSignupError] = useState<string | undefined>();

  // Final onboarding step: the account is created here, on the device, from
  // everything collected across the flow. No network, so this can't fail for
  // connectivity reasons.
  const handleSubmit = async (place: USPlace, district: number | null) => {
    if (submitting) return;

    update({
      usState: place.name,
      usStateCode: place.code,
      district,
    });

    setSignupError(undefined);
    setSubmitting(true);
    try {
      const user = await createAccount({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        pin: data.pin,
        state: place.code,
        district,
        lang: data.languageCode ?? 'en',
        eligibilityRule: data.exemption ?? null,
      });
      await session.signIn(user);
      // Onboarding is done - replace so the back gesture doesn't reenter the flow.
      router.replace('/dashboard');
    } catch {
      setSignupError("We couldn't save your account on this device. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StateDistrictPicker
      header={
        <>
          <ScreenHeader />
          <View style={styles.top}>
            <StepDots total={3} current={2} />
            <AppText variant="headlineLg" color="navy">
              What state do you live in?
            </AppText>
          </View>
        </>
      }
      initialCode={data.usStateCode}
      initialDistrict={data.district}
      submitLabel="Continue"
      submitting={submitting}
      serverError={signupError}
      onSubmit={handleSubmit}
    />
  );
}

const styles = StyleSheet.create({
  top: {
    gap: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
});
