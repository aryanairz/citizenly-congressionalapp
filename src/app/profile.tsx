import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppText,
  BottomNav,
  Button,
  Card,
  Divider,
  Input,
  PinInput,
  ScreenContainer,
  ScreenHeader,
} from '@/components';
import { US_STATES } from '@/constants/us-states';
import { Colors, Spacing } from '@/constants/design';
import { ApiError, apiUpdateEmail, apiUpdatePin } from '@/lib/api';
import { useSession } from '@/lib/session-context';

type OpenSection = 'none' | 'email' | 'pin';

/**
 * Profile: account details with explicit-save editing. Email changes require
 * the current PIN; PIN changes require current + new + confirm; location edits
 * reuse the onboarding picker on a separate screen (no PIN). Logout at bottom.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const session = useSession();
  const user = session.user;

  const [open, setOpen] = useState<OpenSection>('none');

  if (!user) {
    // Session expired/logged out while here — nothing to show.
    return (
      <ScreenContainer>
        <ScreenHeader />
        <View style={styles.centerFill}>
          <AppText variant="bodyLg" color="muted" center>
            Please log in to see your profile.
          </AppText>
          <Button label="Go to Log In" onPress={() => router.replace('/log-in')} fullWidth={false} />
        </View>
      </ScreenContainer>
    );
  }

  const placeName = US_STATES.find((p) => p.code === user.state)?.name ?? user.state ?? 'Not set';
  const locationValue =
    user.district && user.district > 0 ? `${placeName} · District ${user.district}` : placeName;

  const handleLogout = () => {
    Alert.alert('Log out?', 'You will need your email and PIN to log back in.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await session.signOut();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <ScreenContainer padded={false}>
      <View style={styles.body}>
        <ScreenHeader />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          <AppText variant="headlineLg" color="navy">
            Profile
          </AppText>

          <Card style={styles.card}>
            <ReadOnlyRow label="Name" value={user.name} />
            <Divider />

            {/* Email — editable, PIN-confirmed */}
            <EditableRow
              label="Email"
              value={user.email ?? '—'}
              editing={open === 'email'}
              onToggle={() => setOpen(open === 'email' ? 'none' : 'email')}>
              <EmailEditor onDone={() => setOpen('none')} />
            </EditableRow>
            <Divider />

            {/* PIN — separate change flow */}
            <EditableRow
              label="PIN"
              value="•••••"
              editing={open === 'pin'}
              onToggle={() => setOpen(open === 'pin' ? 'none' : 'pin')}
              editLabel="Change">
              <PinEditor onDone={() => setOpen('none')} />
            </EditableRow>
            <Divider />

            {/* Location — no PIN; reuses the onboarding picker on its own screen */}
            <EditableRow
              label="State & District"
              value={locationValue}
              editing={false}
              onToggle={() => router.push('/edit-location')}
            />
          </Card>

          <Button
            label="Log Out"
            variant="secondary"
            labelColor="red"
            onPress={handleLogout}
            style={styles.logout}
          />
        </ScrollView>
      </View>

      <BottomNav active="profile" />
    </ScreenContainer>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <AppText variant="labelMd" color="muted" style={styles.rowLabel}>
          {label}
        </AppText>
        <AppText variant="labelLg" color="navy">
          {value}
        </AppText>
      </View>
    </View>
  );
}

function EditableRow({
  label,
  value,
  editing,
  onToggle,
  editLabel = 'Edit',
  children,
}: {
  label: string;
  value: string;
  editing: boolean;
  onToggle: () => void;
  editLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <View>
      <View style={styles.row}>
        <View style={styles.rowText}>
          <AppText variant="labelMd" color="muted" style={styles.rowLabel}>
            {label}
          </AppText>
          <AppText variant="labelLg" color="navy">
            {value}
          </AppText>
        </View>
        <Button
          label={editing ? 'Cancel' : editLabel}
          variant="secondary"
          onPress={onToggle}
          fullWidth={false}
          style={styles.editButton}
        />
      </View>
      {editing ? <View style={styles.editor}>{children}</View> : null}
    </View>
  );
}

/** New email + current PIN → save. */
function EmailEditor({ onDone }: { onDone: () => void }) {
  const session = useSession();
  const [newEmail, setNewEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving || !session.token) return;
    const entered = newEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(entered)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (pin.length !== 5) {
      setError('Please enter your current 5-digit PIN.');
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      const saved = await apiUpdateEmail(entered, pin, session.token);
      await session.updateUser({ email: saved });
      onDone();
    } catch (e: unknown) {
      setError(
        e instanceof ApiError
          ? e.message
          : "We couldn't save your changes. Please check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.editorInner}>
      <Input
        label="New Email Address"
        value={newEmail}
        onChangeText={setNewEmail}
        placeholder="your.email@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <View style={styles.pinGroup}>
        <AppText variant="labelLg" color="navy">
          Confirm with your current PIN
        </AppText>
        <PinInput onChange={setPin} />
      </View>
      {error ? (
        <AppText variant="bodyMd" style={styles.errorText}>
          {error}
        </AppText>
      ) : null}
      <Button label="Save Email" onPress={handleSave} loading={saving} />
    </View>
  );
}

/** Current PIN + new PIN + confirmation → save. */
function PinEditor({ onDone }: { onDone: () => void }) {
  const session = useSession();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving || !session.token) return;
    if (currentPin.length !== 5) {
      setError('Please enter your current 5-digit PIN.');
      return;
    }
    if (newPin.length !== 5) {
      setError('Your new PIN must be 5 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setError("The new PINs don't match. Please try again.");
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      await apiUpdatePin(currentPin, newPin, session.token);
      Alert.alert('PIN changed', 'Use your new PIN the next time you log in.');
      onDone();
    } catch (e: unknown) {
      setError(
        e instanceof ApiError
          ? e.message
          : "We couldn't save your changes. Please check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.editorInner}>
      <View style={styles.pinGroup}>
        <AppText variant="labelLg" color="navy">
          Current PIN
        </AppText>
        <PinInput onChange={setCurrentPin} />
      </View>
      <View style={styles.pinGroup}>
        <AppText variant="labelLg" color="navy">
          New PIN
        </AppText>
        <PinInput onChange={setNewPin} />
      </View>
      <View style={styles.pinGroup}>
        <AppText variant="labelLg" color="navy">
          Confirm New PIN
        </AppText>
        <PinInput onChange={setConfirmPin} />
      </View>
      {error ? (
        <AppText variant="bodyMd" style={styles.errorText}>
          {error}
        </AppText>
      ) : null}
      <Button label="Save New PIN" onPress={handleSave} loading={saving} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: Spacing.screenX,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  card: {
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 56,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    textTransform: 'uppercase',
  },
  editButton: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
  },
  editor: {
    paddingTop: Spacing.md,
  },
  editorInner: {
    gap: Spacing.md,
  },
  pinGroup: {
    gap: Spacing.sm,
  },
  errorText: {
    color: Colors.red,
  },
  logout: {
    borderColor: Colors.red,
  },
  icon: {
    color: Colors.navy,
  },
});
