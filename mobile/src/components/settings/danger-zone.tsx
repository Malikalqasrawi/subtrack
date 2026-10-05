import { useState } from 'react';
import { Text } from 'react-native';

import { userApi } from '@/api/endpoints';
import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { CODE_LENGTH } from '@/components/code-field';
import { PasswordField } from '@/components/password-field';
import { OwnerCode } from '@/components/settings/owner-code';
import { SettingsSection } from '@/components/settings/section';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/errors';
import { useCurrentUser, useSession } from '@/session/session-context';

export function DangerZone() {
  const theme = useTheme();
  const user = useCurrentUser();
  const { clearSession } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [ownerCode, setOwnerCode] = useState('');
  const [error, setError] = useState<string>();
  const [deleting, setDeleting] = useState(false);

  async function deleteAccount() {
    setDeleting(true);
    setError(undefined);
    try {
      await userApi.deleteAccount(user.hasPassword ? { currentPassword: password } : { confirmationCode: ownerCode });
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
    setOwnerCode('');
    setError(undefined);
  }

  const confirmed = user.hasPassword ? password !== '' : ownerCode.length === CODE_LENGTH;

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
            <OwnerCode code={ownerCode} onChange={setOwnerCode} />
          )}
          {error && <Banner message={error} />}
          <Button label="Delete forever" variant="danger" onPress={deleteAccount} busy={deleting} disabled={!confirmed} />
          <Button label="Keep my account" variant="ghost" onPress={keepAccount} disabled={deleting} />
        </>
      )}
    </SettingsSection>
  );
}
