import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, ScreenHeader, StateDistrictPicker, StepDots } from '@/components';
import type { USPlace } from '@/constants/us-states';
import { Spacing } from '@/constants/design';
import { ApiError, apiSignup } from '@/lib/api';
import { useOnboarding } from '@/lib/onboarding-context';
import { useSession } from '@/lib/session-context';

export default function StateScreen() {
  const router = useRouter();
  const session = useSession();
  const { data, update } = useOnboarding();
  const [submitting, setSubmitting] = useState(false);
  const [signupError, setSignupError] = useState<string | undefined>();

  // Final onboarding step: this is where the account is actually created —
  // one /api/signup call carrying everything collected across the flow.
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
      const { user: created, token } = await apiSignup({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        pin: data.pin,
        state: place.code,
        district: district ?? undefined,
        lang: data.languageCode ?? 'en',
        eligibilityRule: data.exemption ?? undefined,
      });
      // Signup echoes only id + name; build the full user locally so the
      // session is complete even if the follow-up /me fetch can't run.
      await session.signIn(
        {
          id: created.id,
          name: created.name,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          state: place.code,
          district: district ?? undefined,
          preferredLang: data.languageCode ?? 'en',
          eligibilityRule: data.exemption ?? undefined,
        },
        token,
      );
      // Onboarding is done — replace so the back gesture doesn't reenter the flow.
      router.replace('/dashboard');
    } catch (error: unknown) {
      if (error instanceof ApiError && /duplicate/i.test(error.message)) {
        setSignupError('An account with this email already exists. Please log in instead.');
      } else if (error instanceof ApiError) {
        setSignupError(error.message);
      } else {
        setSignupError(
          "We couldn't reach the server. Please check your connection and try again.",
        );
      }
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
