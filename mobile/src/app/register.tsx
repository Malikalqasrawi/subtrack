import { useRouter } from 'expo-router';
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
import { isValidEmail } from '@/lib/email';
import { isStrongPassword, isValidPhone, normalizePhone } from '@/lib/password';
import { pendingVerification } from '@/session/pending-verification';
import { useSession } from '@/session/session-context';

export default function RegisterScreen() {
  const { signIn } = useSession();
  const theme = useTheme();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const complete = displayName.trim() !== '' && email.trim() !== '' && phone.trim() !== '' && isStrongPassword(password);

  async function submit() {
    setError(undefined);
    const address = email.trim();
    const mistakes: Record<string, string> = {};
    if (!isValidEmail(address)) mistakes.email = 'Enter a full email address, like name@example.com';
    if (!isValidPhone(phone)) mistakes.phoneNumber = 'Use international format, for example +962791234567';
    setFieldErrors(mistakes);
    if (Object.keys(mistakes).length > 0) return;
    setSubmitting(true);
    try {
      await authApi.register(address, password, displayName.trim(), normalizePhone(phone));
      pendingVerification.set({ email: address, password });
      router.push('/verify-email');
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) setFieldErrors(err.fieldErrors);
      else setError(err instanceof Error ? err.message : 'Could not create the account');
    } finally {
      setSubmitting(false);
    }
  }

  async function onGoogleResult(result: AuthResponse) {
    if (result.twoFactorRequired) {
      router.dismissTo({ pathname: '/sign-in', params: { challengeToken: result.challengeToken } });
    } else await signIn(result);
  }

  return (
    <AuthScreen title="Create your account" subtitle="We'll email you a code to confirm your address.">
      <TextField
        label="Name"
        value={displayName}
        onChangeText={setDisplayName}
        autoComplete="name"
        textContentType="name"
        maxLength={80}
        error={fieldErrors.displayName}
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        maxLength={254}
        error={fieldErrors.email}
      />
      <TextField
        label="Phone number"
        value={phone}
        onChangeText={setPhone}
        placeholder="+962 79 123 4567"
        autoComplete="tel"
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        maxLength={24}
        hint="With country code, for example +962 79 123 4567"
        error={fieldErrors.phoneNumber}
      />
      <PasswordField
        label="Password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        error={fieldErrors.password}
        showRules
      />
      {error && <Banner message={error} />}
      <Button label="Create account" onPress={submit} busy={submitting} disabled={!complete} />
      <GoogleButton onResult={onGoogleResult} onError={setError} disabled={submitting} />
      <View style={styles.switch}>
        <Text style={{ color: theme.textSecondary }}>Already have an account?</Text>
        <TextLink label="Sign in" onPress={() => router.dismissTo('/sign-in')} />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  switch: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
