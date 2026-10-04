import { useState } from 'react';
import { Alert } from 'react-native';

import { userApi } from '@/api/endpoints';
import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { SettingsSection } from '@/components/settings/section';
import { errorMessage } from '@/lib/errors';
import { useSession } from '@/session/session-context';

export function SessionsSection() {
  const { signOut, clearSession } = useSession();
  const [busy, setBusy] = useState<'here' | 'everywhere'>();
  const [error, setError] = useState<string>();

  async function signOutHere() {
    setBusy('here');
    await signOut();
  }

  async function signOutEverywhere() {
    setBusy('everywhere');
    setError(undefined);
    try {
      await userApi.logoutEverywhere();
      // The server has already ended this device's session along with the others.
      await clearSession();
    } catch (err) {
      setError(errorMessage(err, 'Could not sign out of all devices'));
      setBusy(undefined);
    }
  }

  function confirmSignOutEverywhere() {
    Alert.alert(
      'Sign out of all devices?',
      'You will have to sign in again on every phone, tablet and computer, including this one.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: signOutEverywhere },
      ],
    );
  }

  return (
    <SettingsSection title="Sessions" note="Sign out of all devices if you left your account open somewhere.">
      {error && <Banner message={error} />}
      <Button label="Sign out" variant="ghost" onPress={signOutHere} busy={busy === 'here'} disabled={busy !== undefined} />
      <Button
        label="Sign out of all devices"
        variant="danger"
        onPress={confirmSignOutEverywhere}
        busy={busy === 'everywhere'}
        disabled={busy !== undefined}
      />
    </SettingsSection>
  );
}
