import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Input,
  PinInput,
  ScreenContainer,
  ScreenHeader,
} from '@/components';
import { Spacing } from '@/constants/design';
import { useOnboarding } from '@/lib/onboarding-context';
import { t } from '@/lib/ui-i18n';
import { useLang } from '@/lib/use-lang';

export default function SignUpScreen() {
  const router = useRouter();
  const { data, update } = useOnboarding();
  const lang = useLang();

  const [firstName, setFirstName] = useState(data.firstName);
  const [lastName, setLastName] = useState(data.lastName);
  const [email, setEmail] = useState(data.email);
  const [pin, setPin] = useState('');
  const [firstNameError, setFirstNameError] = useState<string | undefined>();
  const [lastNameError, setLastNameError] = useState<string | undefined>();
  const [emailError, setEmailError] = useState<string | undefined>();
  const [pinError, setPinError] = useState<string | undefined>();

  const handleCreateAccount = () => {
    let valid = true;

    if (!firstName.trim()) {
      setFirstNameError('Please enter your first name.');
      valid = false;
    } else {
      setFirstNameError(undefined);
    }

    if (!lastName.trim()) {
      setLastNameError('Please enter your last name.');
      valid = false;
    } else {
      setLastNameError(undefined);
    }

    if (!email.trim()) {
      setEmailError('Please enter your email address.');
      valid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setEmailError('Please enter a valid email address.');
      valid = false;
    } else {
      setEmailError(undefined);
    }

    if (pin.length !== 5) {
      setPinError('Please enter all 5 digits.');
      valid = false;
    } else {
      setPinError(undefined);
    }

    if (!valid) return;

    // PIN is kept in memory only so log-in can validate locally — placeholder
    // until real backend auth exists (see OnboardingData.pin).
    update({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), pin });
    router.push('/onboarding/language');
  };

  // Replace (not push) so the log-in screen's back arrow returns to Welcome,
  // not to a half-filled sign-up form.
  const handleGoToLogIn = () => router.replace('/log-in');

  return (
    <ScreenContainer
      scroll
      keyboardAvoiding
      footer={<FooterActions onSubmit={handleCreateAccount} onLogIn={handleGoToLogIn} />}>
      <ScreenHeader />
      <View style={styles.content}>
        <AppText variant="headlineLg" color="navy">
          Create your account
        </AppText>

        <Input
          label="First Name"
          value={firstName}
          onChangeText={setFirstName}
          placeholder="e.g. Jane"
          autoComplete="given-name"
          error={firstNameError}
        />

        <Input
          label="Last Name"
          value={lastName}
          onChangeText={setLastName}
          placeholder="e.g. Doe"
          autoComplete="family-name"
          error={lastNameError}
        />

        <Input
          label={t('emailAddress', lang)}
          value={email}
          onChangeText={setEmail}
          placeholder="your.email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={emailError}
        />

        <View style={styles.pinGroup}>
          <AppText variant="labelLg" color="navy">
            Create a 5-digit PIN
          </AppText>
          <PinInput onChange={setPin} error={pinError} />
          <AppText variant="bodyMd" color="muted">
            You&apos;ll use this PIN to log in. Choose something easy to remember.
          </AppText>
        </View>
      </View>
    </ScreenContainer>
  );
}

function FooterActions({ onSubmit, onLogIn }: { onSubmit: () => void; onLogIn: () => void }) {
  return (
    <View style={styles.footer}>
      <Button label="Create Account" onPress={onSubmit} />
      <Pressable accessibilityRole="link" onPress={onLogIn} hitSlop={8}>
        <AppText variant="bodyMd" color="muted" center style={styles.loginLine}>
          Already have an account?{' '}
          <AppText variant="labelLg" color="navy" style={styles.loginLink}>
            Log in
          </AppText>
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  pinGroup: {
    gap: Spacing.sm,
  },
  footer: {
    gap: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  loginLine: {
    paddingVertical: Spacing.sm,
  },
  loginLink: {
    textDecorationLine: 'underline',
  },
});
