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
import { Colors, Spacing } from '@/constants/design';
import { confirmAction } from '@/lib/confirm';
import { AccountError, logIn } from '@/lib/local-account';
import { useSession } from '@/lib/session-context';
import { t } from '@/lib/ui-i18n';
import { useLang } from '@/lib/use-lang';

export default function LogInScreen() {
  const router = useRouter();
  const session = useSession();
  const lang = useLang();

  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [pinError, setPinError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [forgotPressed, setForgotPressed] = useState(false);

  const handleLogIn = async () => {
    if (submitting) return;
    const entered = email.trim().toLowerCase();
    let valid = true;

    if (!entered) {
      setEmailError('Please enter your email address.');
      valid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(entered)) {
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

    setServerError(undefined);
    setSubmitting(true);
    try {
      // Local check against the account saved on this device - no network.
      const user = await logIn(entered, pin);
      await session.signIn(user);
      router.replace('/dashboard');
    } catch (error: unknown) {
      setServerError(
        error instanceof AccountError
          ? error.message
          : "We couldn't open your account on this device. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // No server means no password reset. Offer the only thing that can help:
  // starting a new account on this device.
  const handleForgotPin = () => {
    void confirmAction({
      title: 'Forgot your PIN?',
      message:
        'Your account is saved only on this phone, so there’s no PIN to email you. You can start a new account instead - your study progress on this device stays.',
      confirmLabel: 'Start a new account',
      cancelLabel: 'Never mind',
    }).then((confirmed) => {
      if (confirmed) router.replace('/sign-up');
    });
  };

  return (
    <ScreenContainer scroll keyboardAvoiding>
      <ScreenHeader />
      <View style={styles.content}>
        <View style={styles.headingGroup}>
          <AppText variant="headlineLg" color="navy">
            {t('logIn', lang)}
          </AppText>
          <AppText variant="bodyLg" color="muted">
            Enter your details to access your account.
          </AppText>
        </View>

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
            5-Digit PIN
          </AppText>
          <PinInput onChange={setPin} error={pinError} />
        </View>

        <View style={styles.actions}>
          {serverError ? (
            <AppText variant="bodyMd" center style={styles.serverError}>
              {serverError}
            </AppText>
          ) : null}
          <Button label={t('logIn', lang)} onPress={handleLogIn} loading={submitting} />
          <Pressable
            accessibilityRole="link"
            onPress={handleForgotPin}
            onPressIn={() => setForgotPressed(true)}
            onPressOut={() => setForgotPressed(false)}
            hitSlop={8}>
            <AppText
              variant="labelLg"
              color="navy"
              center
              style={[styles.forgotLink, forgotPressed && styles.forgotPressed]}>
              Forgot PIN?
            </AppText>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  headingGroup: {
    gap: Spacing.sm,
  },
  pinGroup: {
    gap: Spacing.sm,
  },
  actions: {
    gap: Spacing.md,
    paddingTop: Spacing.md,
  },
  forgotLink: {
    textDecorationLine: 'underline',
    paddingVertical: Spacing.sm,
  },
  forgotPressed: {
    opacity: 0.6,
  },
  serverError: {
    color: Colors.red,
  },
});
