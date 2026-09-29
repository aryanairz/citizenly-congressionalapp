import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppText,
  BottomNav,
  Button,
  Card,
  Input,
  PinInput,
  ScreenContainer,
  ScreenHeader,
} from '@/components';
import { US_STATES } from '@/constants/us-states';
import { Colors, Spacing } from '@/constants/design';
import { confirmAction, notify } from '@/lib/confirm';
import { checkPin, updateAccount } from '@/lib/local-account';
import { useSession } from '@/lib/session-context';
import { canSpeak, useAutoSpeak } from '@/lib/speech';
import { t } from '@/lib/ui-i18n';
import { useLang } from '@/lib/use-lang';

type OpenSection = 'none' | 'email' | 'pin';

/**
 * Profile: account details with explicit-save editing. Email changes require
 * the current PIN; PIN changes require current + new + confirm; location edits
 * reuse the onboarding picker on a separate screen (no PIN). Logout at bottom.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const session = useSession();
  const lang = useLang();
  const user = session.user;

  const [open, setOpen] = useState<OpenSection>('none');

  if (!user) {
    // Session expired/logged out while here - nothing to show.
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

  const confirmedLogout = async () => {
    await session.signOut();
    router.replace('/');
  };

  const handleLogout = () => {
    void confirmAction({
      title: 'Log out?',
      message: 'You will need your email and PIN to log back in.',
      confirmLabel: 'Log Out',
      destructive: true,
    }).then((confirmed) => {
      if (confirmed) void confirmedLogout();
    });
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
          <AppText variant="display" color="navy">
            Profile
          </AppText>

          {/* One card per setting rather than four rows divided inside one.
              Each is its own thing to change, and separate surfaces say that
              more clearly than hairlines through a single block do. */}
          <AppText variant="labelMd" color="subtle" style={styles.sectionLabel}>
            Account
          </AppText>
          <View style={styles.group}>
            <Card style={styles.card}>
              <ReadOnlyRow label="Name" value={user.name} />
            </Card>

            {/* Email - editable, PIN-confirmed */}
            <Card style={styles.card}>
              <EditableRow
                label="Email"
                value={user.email ?? 'Not set'}
                editing={open === 'email'}
                onToggle={() => setOpen(open === 'email' ? 'none' : 'email')}>
                <EmailEditor onDone={() => setOpen('none')} />
              </EditableRow>
            </Card>

            {/* PIN - separate change flow */}
            <Card style={styles.card}>
              <EditableRow
                label="PIN"
                value="•••••"
                editing={open === 'pin'}
                onToggle={() => setOpen(open === 'pin' ? 'none' : 'pin')}
                editLabel="Change">
                <PinEditor onDone={() => setOpen('none')} />
              </EditableRow>
            </Card>

            {/* Location - no PIN; reuses the onboarding picker on its own screen */}
            <Card style={styles.card}>
              <EditableRow
                label="State & District"
                value={locationValue}
                editing={false}
                onToggle={() => router.push('/edit-location')}
              />
            </Card>
          </View>

          <AppText variant="labelMd" color="subtle" style={styles.sectionLabel}>
            Audio
          </AppText>
          <Card style={styles.card}>
            <AutoSpeakRow />
          </Card>

          <Button
            label={t('logOut', lang)}
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

/**
 * Auto-speak toggle. Hearing the answer read out is the reason a non-reader
 * can use the app unaided, so it ships on - but it wears thin for someone who
 * reads fine, and this is the one tap that stops it. Manual speaker buttons
 * keep working either way.
 */
function AutoSpeakRow() {
  const lang = useLang();
  const { autoSpeak, setAutoSpeak } = useAutoSpeak();
  const [pressed, setPressed] = useState(false);

  // Nothing to configure in a language with no voice at all.
  if (!canSpeak(lang)) return null;

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: autoSpeak }}
      accessibilityLabel={t('autoSpeakTitle', lang)}
      onPress={() => setAutoSpeak(!autoSpeak)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}>
      <View style={[styles.speakRow, pressed && styles.speakRowPressed]}>
        <View style={styles.speakCopy}>
          <AppText variant="labelLg" color="navy">
            {t('autoSpeakTitle', lang)}
          </AppText>
          <AppText variant="bodyMd" color="muted">
            {t(autoSpeak ? 'autoSpeakOn' : 'autoSpeakOff', lang)}
          </AppText>
        </View>
        <MaterialIcons
          name={autoSpeak ? 'volume-up' : 'volume-off'}
          size={28}
          color={autoSpeak ? Colors.navy : Colors.subtle}
        />
      </View>
    </Pressable>
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
    if (saving) return;
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
      if (!(await checkPin(pin))) {
        setError("That PIN doesn't match your account.");
        setSaving(false);
        return;
      }
      await updateAccount({ email: entered });
      await session.updateUser({ email: entered });
    } catch {
      setError("We couldn't save your changes on this device. Please try again.");
      setSaving(false);
      return;
    }
    setSaving(false);
    onDone();
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
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;
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
      if (!(await checkPin(currentPin))) {
        setError("That PIN doesn't match your account.");
        return;
      }
      await updateAccount({ pin: newPin });
      notify('PIN changed', 'Use your new PIN the next time you log in.');
      onDone();
    } catch {
      setError("We couldn't save your changes on this device. Please try again.");
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
  group: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    paddingTop: Spacing.sm,
  },
  speakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    // Matches the 72px list-row target used elsewhere.
    minHeight: 72 - Spacing.lg * 2,
  },
  speakRowPressed: {
    opacity: 0.6,
  },
  speakCopy: {
    flex: 1,
    gap: Spacing.xs,
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
