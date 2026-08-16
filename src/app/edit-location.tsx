import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, ScreenHeader, StateDistrictPicker } from '@/components';
import type { USPlace } from '@/constants/us-states';
import { Spacing } from '@/constants/design';
import { ApiError, apiUpdatePlace } from '@/lib/api';
import { useSession } from '@/lib/session-context';

/**
 * Profile → change state/district. Reuses the exact onboarding picker, saves
 * via PATCH /api/users/place (no PIN), and updates the cached session user so
 * personalized questions re-drive from the new location immediately.
 */
export default function EditLocationScreen() {
  const router = useRouter();
  const session = useSession();
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | undefined>();

  const handleSubmit = async (place: USPlace, district: number | null) => {
    if (saving || !session.token) return;
    setServerError(undefined);
    setSaving(true);
    try {
      await apiUpdatePlace(place.code, district, session.token);
      await session.updateUser({ state: place.code, district: district ?? undefined });
      router.back();
    } catch (e: unknown) {
      setServerError(
        e instanceof ApiError
          ? e.message
          : "We couldn't save your changes. Please check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <StateDistrictPicker
      header={
        <>
          <ScreenHeader />
          <View style={styles.top}>
            <AppText variant="headlineLg" color="navy">
              Update your state
            </AppText>
            <AppText variant="bodyMd" color="muted">
              Your personalized questions (governor, senators, representative, capital) will
              update to match.
            </AppText>
          </View>
        </>
      }
      initialCode={session.user?.state}
      initialDistrict={session.user?.district ?? null}
      submitLabel="Save Location"
      submitting={saving}
      serverError={serverError}
      onSubmit={handleSubmit}
    />
  );
}

const styles = StyleSheet.create({
  top: {
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
});
