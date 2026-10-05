import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { authApi } from '@/api/endpoints';
import { AuthScreen } from '@/components/auth-screen';
import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { CODE_LENGTH, CodeField } from '@/components/code-field';
import { TextLink } from '@/components/text-link';
import { Spacing } from '@/constants/theme';
import { useCooldown } from '@/hooks/use-cooldown';
import { pendingVerification } from '@/session/pending-verification';
import { useSession } from '@/session/session-context';

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailScreen() {
  const { signIn } = useSession();
  const router = useRouter();
  const [credentials] = useState(pendingVerification.get);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, restartCooldown] = useCooldown(RESEND_COOLDOWN_SECONDS);

  // The credentials are kept in memory only, so after an app restart the user signs in again.
  if (!credentials) return <Redirect href="/sign-in" />;
  const { email, password } = credentials;

  async function submit() {
    if (code.length !== CODE_LENGTH || submitting) return;
    setSubmitting(true);
    setError(undefined);
    setNotice(undefined);
    try {
      const session = await authApi.verify(email, password, code);
      pendingVerification.clear();
      await signIn(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify the code');
      setCode('');
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    setError(undefined);
    try {
      await authApi.resendVerification(email);
      setNotice('A new code is on its way.');
      restartCooldown();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the code');
    }
  }

  function useDifferentEmail() {
    pendingVerification.clear();
    router.dismissTo('/sign-in');
  }

  return (
    <AuthScreen title="Check your email" subtitle={`Enter the 6-digit code we sent to ${email}. It expires in 15 minutes.`}>
      <CodeField value={code} onChange={setCode} onSubmit={submit} />
      {error && <Banner message={error} />}
      {notice && <Banner tone="success" message={notice} />}
      <Button label="Verify email" onPress={submit} busy={submitting} disabled={code.length !== CODE_LENGTH} />
      <View style={styles.links}>
        <TextLink label={cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'} onPress={resend} disabled={cooldown > 0} />
        <TextLink label="Use a different email" onPress={useDifferentEmail} />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  links: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
