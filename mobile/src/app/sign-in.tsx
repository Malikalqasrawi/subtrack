import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { authApi } from '@/api/endpoints';
import type { AuthResponse } from '@/api/types';
import { AuthScreen } from '@/components/auth-screen';
import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { GoogleButton } from '@/components/google-button';
import { PasswordField } from '@/components/password-field';
import { TextField } from '@/components/text-field';
import { TextLink } from '@/components/text-link';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { pendingVerification } from '@/session/pending-verification';
import { useSession } from '@/session/session-context';

export default function SignInScreen() {
  const { signIn } = useSession();
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ passwordChanged?: string; challengeToken?: string }>();
  const { passwordChanged } = params;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // A Google sign-up for an account with two-factor on arrives here with its challenge.
  const [challengeToken, setChallengeToken] = useState(params.challengeToken);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  /** Finishes sign-in, or moves to the second step when the account has two-factor on. */
  async function onResult(result: AuthResponse) {
    if (result.twoFactorRequired) setChallengeToken(result.challengeToken);
    else await signIn(result);
  }

  const canSignIn = email.trim() !== '' && password !== '';
  const canCheckCode = code.trim().length >= 6;

  /**
   * Runs one request. Skipped while the form is incomplete or a request is already running:
   * the buttons are disabled then, but the keyboard's Enter key is not.
   */
  async function submit(ready: boolean, action: () => Promise<void>, fallback: string) {
    if (!ready || submitting) return;
    setSubmitting(true);
    setError(undefined);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
    } finally {
      setSubmitting(false);
    }
  }

  const submitPassword = () =>
    submit(canSignIn, async () => {
      const address = email.trim();
      try {
        await onResult(await authApi.login(address, password));
      } catch (err) {
        if (!(err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED')) throw err;
        // The password was right, so carry it along: verifying needs it too.
        await authApi.resendVerification(address).catch(() => {});
        pendingVerification.set({ email: address, password });
        router.push('/verify-email');
      }
    }, 'Could not sign in');

  const submitCode = () =>
    submit(canCheckCode, async () => {
      if (challengeToken) await signIn(await authApi.twoFactor(challengeToken, code.trim()));
    }, 'Could not check the code');

  if (challengeToken !== undefined) {
    return (
      <AuthScreen
        title="Two-factor check"
        subtitle="Enter the 6-digit code from your authenticator app, or one of your recovery codes.">
        <TextField
          label="Code"
          value={code}
          onChangeText={setCode}
          placeholder="123456"
          autoCapitalize="characters"
          autoComplete="one-time-code"
          autoCorrect={false}
          maxLength={20}
          autoFocus
          onSubmitEditing={submitCode}
        />
        {error && <Banner message={error} />}
        <Button label="Continue" onPress={submitCode} busy={submitting} disabled={!canCheckCode} />
        <Button
          label="Back to sign in"
          variant="ghost"
          onPress={() => {
            setChallengeToken(undefined);
            setCode('');
            setError(undefined);
          }}
        />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title="Welcome back" subtitle="Sign in to see what renews next.">
      {passwordChanged && !error && <Banner tone="success" message="Password changed. Sign in with your new password." />}
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password" onSubmit={submitPassword} />
      <View style={styles.forgot}>
        <TextLink
          label="Forgot password?"
          onPress={() => router.push({ pathname: '/forgot-password', params: { email: email.trim() } })}
        />
      </View>
      {error && <Banner message={error} />}
      <Button label="Sign in" onPress={submitPassword} busy={submitting} disabled={!canSignIn} />
      <GoogleButton onResult={onResult} onError={setError} disabled={submitting} />
      <View style={styles.switch}>
        <Text style={{ color: theme.textSecondary }}>New here?</Text>
        <TextLink label="Create an account" onPress={() => router.push('/register')} />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  forgot: {
    alignItems: 'flex-end',
  },
  switch: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
