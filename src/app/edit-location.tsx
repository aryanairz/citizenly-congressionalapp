import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, ScreenHeader, StateDistrictPicker } from '@/components';
import type { USPlace } from '@/constants/us-states';
import { Spacing } from '@/constants/design';
import { updateAccount } from '@/lib/local-account';
import { useSession } from '@/lib/session-context';

/**
 * Profile → change state/district. Reuses the exact onboarding picker, saves
 * to the local account, and updates the session user so personalized
 * questions re-drive from the new location immediately.
 */
export default function EditLocationScreen() {
  const router = useRouter();
  const session = useSession();
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | undefined>();

  const handleSubmit = async (place: USPlace, district: number | null) => {
    if (saving) return;
    setServerError(undefined);
    setSaving(true);
    try {
      await updateAccount({ state: place.code, district });
      await session.updateUser({ state: place.code, district });
    } catch {
      setServerError("We couldn't save your changes on this device. Please try again.");
      setSaving(false);
      return;
    }
    setSaving(false);
    router.back();
  };

  return (
    <StateDistrictPicker
      header={
        <>
          <ScreenHeader />
          <View style={styles.top}>
            <AppText variant="display" color="navy">
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
