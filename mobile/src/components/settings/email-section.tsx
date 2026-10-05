import { useState } from 'react';
import { Text } from 'react-native';

import { userApi } from '@/api/endpoints';
import { Banner, type BannerProps } from '@/components/banner';
import { Button } from '@/components/button';
import { CODE_LENGTH, CodeField } from '@/components/code-field';
import { PasswordField } from '@/components/password-field';
import { SettingsSection } from '@/components/settings/section';
import { TextField } from '@/components/text-field';
import { useTheme } from '@/hooks/use-theme';
import { isValidEmail } from '@/lib/email';
import { errorMessage } from '@/lib/errors';
import { useCurrentUser, useSession } from '@/session/session-context';

export function EmailSection() {
  const theme = useTheme();
  const user = useCurrentUser();
  const { updateUser } = useSession();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  // Set once a code has been sent to the new address and is waiting to be confirmed.
  const [pendingEmail, setPendingEmail] = useState<string>();
  const [code, setCode] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [result, setResult] = useState<BannerProps>();
  const [busy, setBusy] = useState(false);

  async function requestChange() {
    const address = newEmail.trim();
    setResult(undefined);
    if (!isValidEmail(address)) {
      setEmailError('Enter a full email address, like name@example.com');
      return;
    }
    setEmailError(undefined);
    setBusy(true);
    try {
      await userApi.requestEmailChange(address, password);
      setPendingEmail(address);
    } catch (err) {
      setResult({ message: errorMessage(err, 'Could not start the email change') });
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (code.length !== CODE_LENGTH || busy) return;
    setBusy(true);
    setResult(undefined);
    try {
      updateUser(await userApi.confirmEmailChange(code));
      setResult({ tone: 'success', message: 'Email address changed' });
      setPendingEmail(undefined);
      setNewEmail('');
      setPassword('');
    } catch (err) {
      setResult({ message: errorMessage(err, 'Could not confirm the code') });
    } finally {
      setCode('');
      setBusy(false);
    }
  }

  function cancel() {
    setPendingEmail(undefined);
    setCode('');
    setResult(undefined);
  }

  if (pendingEmail) {
    return (
      <SettingsSection title="Email address" note={`Currently ${user.email}`}>
        <Text style={{ color: theme.textSecondary }}>
          Enter the code we sent to {pendingEmail}. Your email changes once it is confirmed.
        </Text>
        <CodeField value={code} onChange={setCode} onSubmit={confirm} />
        {result && <Banner {...result} />}
        <Button label="Confirm new email" onPress={confirm} busy={busy} disabled={code.length !== CODE_LENGTH} />
        <Button label="Cancel" variant="ghost" onPress={cancel} disabled={busy} />
      </SettingsSection>
    );
  }

  return (
    <SettingsSection title="Email address" note={`Currently ${user.email}`}>
      <TextField
        label="New email"
        value={newEmail}
        onChangeText={setNewEmail}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        maxLength={254}
        error={emailError}
      />
      {user.hasPassword && (
        <PasswordField label="Current password" value={password} onChange={setPassword} autoComplete="current-password" />
      )}
      {result && <Banner {...result} />}
      <Button
        label="Send confirmation code"
        onPress={requestChange}
        busy={busy}
        disabled={newEmail.trim() === '' || (user.hasPassword && password === '')}
      />
    </SettingsSection>
  );
}
