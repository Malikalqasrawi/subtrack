import { useState } from 'react';
import { Text } from 'react-native';

import { userApi } from '@/api/endpoints';
import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { PasswordField } from '@/components/password-field';
import { SettingsSection } from '@/components/settings/section';
import { TextField } from '@/components/text-field';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/errors';
import { useCurrentUser, useSession } from '@/session/session-context';

const CONFIRM_WORD = 'DELETE';

export function DangerZone() {
  const theme = useTheme();
  const user = useCurrentUser();
  const { clearSession } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string>();
  const [deleting, setDeleting] = useState(false);

  async function deleteAccount() {
    setDeleting(true);
    setError(undefined);
    try {
      await userApi.deleteAccount(password);
      // The account and its sessions are gone on the server; only this device still remembers them.
      await clearSession();
    } catch (err) {
      setError(errorMessage(err, 'Could not delete the account'));
      setDeleting(false);
    }
  }

  function keepAccount() {
    setConfirming(false);
    setPassword('');
    setTyped('');
    setError(undefined);
  }

  // An account created with Google has no password to ask for, so it types a word instead.
  const confirmed = user.hasPassword ? password !== '' : typed === CONFIRM_WORD;

  return (
    <SettingsSection
      title="Delete account"
      note="Permanently removes your account, subscriptions and reminders. This cannot be undone.">
      {!confirming ? (
        <Button label="Delete my account" variant="danger" onPress={() => setConfirming(true)} />
      ) : (
        <>
          <Text style={{ color: theme.textSecondary }}>Everything tied to {user.email} will be removed for good.</Text>
          {user.hasPassword ? (
            <PasswordField label="Your password" value={password} onChange={setPassword} autoComplete="current-password" />
          ) : (
            <TextField
              label={`Type ${CONFIRM_WORD} to confirm`}
              value={typed}
              onChangeText={setTyped}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={CONFIRM_WORD.length}
            />
          )}
          {error && <Banner message={error} />}
          <Button label="Delete forever" variant="danger" onPress={deleteAccount} busy={deleting} disabled={!confirmed} />
          <Button label="Keep my account" variant="ghost" onPress={keepAccount} disabled={deleting} />
        </>
      )}
    </SettingsSection>
  );
}
