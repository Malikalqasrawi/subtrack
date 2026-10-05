import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { authApi } from '@/api/endpoints';
import { AuthScreen } from '@/components/auth-screen';
import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { CODE_LENGTH, CodeField } from '@/components/code-field';
import { PasswordField } from '@/components/password-field';
import { TextField } from '@/components/text-field';
import { TextLink } from '@/components/text-link';
import { Spacing } from '@/constants/theme';
import { useCooldown } from '@/hooks/use-cooldown';
import { isStrongPassword } from '@/lib/password';

const RESEND_COOLDOWN_SECONDS = 60;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, restartCooldown] = useCooldown(RESEND_COOLDOWN_SECONDS);

  const canRequestCode = email.trim() !== '';

  async function requestCode() {
    if (!canRequestCode || submitting) return;
    setSubmitting(true);
    setError(undefined);
    try {
      await authApi.forgotPassword(email.trim());
      setCodeSent(true);
      restartCooldown();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the code');
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    setError(undefined);
    setNotice(undefined);
    try {
      await authApi.forgotPassword(email.trim());
      setNotice('A new code is on its way.');
      restartCooldown();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the code');
    }
  }

  async function reset() {
    setSubmitting(true);
    setError(undefined);
    setNotice(undefined);
    try {
      await authApi.resetPassword(email.trim(), code, password);
      router.dismissTo({ pathname: '/sign-in', params: { passwordChanged: '1' } });
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors.newPassword) setError(`Password ${err.fieldErrors.newPassword}`);
      else setError(err instanceof Error ? err.message : 'Could not reset the password');
    } finally {
      setSubmitting(false);
    }
  }

  const backToSignIn = <TextLink label="Back to sign in" onPress={() => router.dismissTo('/sign-in')} />;

  if (!codeSent) {
    return (
      <AuthScreen title="Forgot your password?" subtitle="Enter your email and we'll send a code to reset it.">
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
          onSubmitEditing={requestCode}
        />
        {error && <Banner message={error} />}
        <Button label="Send reset code" onPress={requestCode} busy={submitting} disabled={!canRequestCode} />
        <View style={styles.links}>{backToSignIn}</View>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Choose a new password"
      subtitle={`If ${email.trim()} has an account, a 6-digit code is on its way. Enter it below.`}>
      <CodeField value={code} onChange={setCode} />
      <PasswordField label="New password" value={password} onChange={setPassword} autoComplete="new-password" showRules />
      <PasswordField
        label="Confirm new password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        error={confirm !== '' && confirm !== password ? 'The passwords do not match' : undefined}
      />
      {error && <Banner message={error} />}
      {notice && <Banner tone="success" message={notice} />}
      <Button
        label="Change password"
        onPress={reset}
        busy={submitting}
        disabled={code.length !== CODE_LENGTH || !isStrongPassword(password) || confirm !== password}
      />
      <View style={styles.resend}>
        <TextLink label={cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'} onPress={resend} disabled={cooldown > 0} />
      </View>
      <View style={styles.links}>
        <TextLink
          label="Use a different email"
          onPress={() => {
            setCodeSent(false);
            setCode('');
            setError(undefined);
            setNotice(undefined);
          }}
        />
        {backToSignIn}
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  resend: {
    alignItems: 'center',
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
