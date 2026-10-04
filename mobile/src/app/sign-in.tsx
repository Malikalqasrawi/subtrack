import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authApi } from '@/api/endpoints';
import type { AuthResponse } from '@/api/types';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/session/session-context';

export default function SignInScreen() {
  const { signIn } = useSession();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challengeToken, setChallengeToken] = useState<string>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  /** Finishes sign-in, or moves to the second step when the account has two-factor on. */
  async function onResult(result: AuthResponse) {
    if (result.twoFactorRequired) setChallengeToken(result.challengeToken);
    else await signIn(result);
  }

  async function submit(action: () => Promise<void>, fallback: string) {
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

  const submitPassword = () => submit(async () => onResult(await authApi.login(email.trim(), password)), 'Could not sign in');

  const submitCode = () =>
    submit(async () => {
      if (challengeToken) await signIn(await authApi.twoFactor(challengeToken, code.trim()));
    }, 'Could not check the code');

  const secondStep = challengeToken !== undefined;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.brand, { color: theme.accent }]}>Subtrack</Text>
          <Text style={[styles.title, { color: theme.text }]}>{secondStep ? 'Two-factor check' : 'Welcome back'}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {secondStep
              ? 'Enter the 6-digit code from your authenticator app, or one of your recovery codes.'
              : 'Sign in to see what renews next.'}
          </Text>

          <View style={styles.form}>
            {secondStep ? (
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
            ) : (
              <>
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
                <TextField
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  autoComplete="current-password"
                  secureTextEntry
                  textContentType="password"
                  maxLength={72}
                  onSubmitEditing={submitPassword}
                />
              </>
            )}

            {error && (
              <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger, backgroundColor: theme.dangerSoft }]}>
                {error}
              </Text>
            )}

            {secondStep ? (
              <>
                <Button label="Continue" onPress={submitCode} busy={submitting} disabled={code.trim().length < 6} />
                <Button
                  label="Back to sign in"
                  variant="ghost"
                  onPress={() => {
                    setChallengeToken(undefined);
                    setCode('');
                    setError(undefined);
                  }}
                />
              </>
            ) : (
              <Button label="Sign in" onPress={submitPassword} busy={submitting} disabled={email.trim() === '' || password === ''} />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  brand: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  form: {
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    padding: Spacing.three,
    borderRadius: Radius.small,
    overflow: 'hidden',
  },
});
