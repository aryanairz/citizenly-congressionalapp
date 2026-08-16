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
import { ApiError, apiLogin } from '@/lib/api';
import { useSession } from '@/lib/session-context';

export default function LogInScreen() {
  const router = useRouter();
  const session = useSession();

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
      const { user, token } = await apiLogin(entered, pin);
      await session.signIn(user, token);
      router.replace('/dashboard');
    } catch (error: unknown) {
      // ApiError = the server answered (wrong PIN, lockout, …) — show its
      // message. Anything else is connectivity.
      setServerError(
        error instanceof ApiError
          ? error.message
          : "We couldn't reach the server. Please check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer scroll keyboardAvoiding>
      <ScreenHeader />
      <View style={styles.content}>
        <View style={styles.headingGroup}>
          <AppText variant="headlineLg" color="navy">
            Log In
          </AppText>
          <AppText variant="bodyLg" color="muted">
            Enter your details to access your account.
          </AppText>
        </View>

        <Input
          label="Email Address"
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
          <Button label="Log In" onPress={handleLogIn} loading={submitting} />
          <Pressable
            accessibilityRole="link"
            onPress={() => {}}
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
