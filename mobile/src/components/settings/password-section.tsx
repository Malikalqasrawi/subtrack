import { useState } from 'react';

import { userApi } from '@/api/endpoints';
import { Banner, type BannerProps } from '@/components/banner';
import { Button } from '@/components/button';
import { CODE_LENGTH } from '@/components/code-field';
import { PasswordField } from '@/components/password-field';
import { OwnerCode } from '@/components/settings/owner-code';
import { SettingsSection } from '@/components/settings/section';
import { errorMessage } from '@/lib/errors';
import { isStrongPassword } from '@/lib/password';
import { useCurrentUser, useSession } from '@/session/session-context';

export function PasswordSection() {
  const user = useCurrentUser();
  const { replaceSession } = useSession();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ownerCode, setOwnerCode] = useState('');
  const [result, setResult] = useState<BannerProps>();
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setResult(undefined);
    try {
      // The server signs out every other device and hands this one a fresh session.
      const proof = user.hasPassword ? { currentPassword: current } : { confirmationCode: ownerCode };
      await replaceSession(await userApi.changePassword(proof, next));
      setResult({ tone: 'success', message: user.hasPassword ? 'Password changed' : 'Password set' });
      setCurrent('');
      setNext('');
      setConfirm('');
      setOwnerCode('');
    } catch (err) {
      setResult({ message: errorMessage(err, 'Could not change the password') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsSection
      title={user.hasPassword ? 'Change password' : 'Set a password'}
      note={
        user.hasPassword
          ? 'Changing it signs you out on your other devices.'
          : 'You signed up with Google or Apple. Add a password to also sign in with your email.'
      }>
      {user.hasPassword ? (
        <PasswordField label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" />
      ) : (
        <OwnerCode code={ownerCode} onChange={setOwnerCode} />
      )}
      <PasswordField label="New password" value={next} onChange={setNext} autoComplete="new-password" showRules />
      <PasswordField
        label="Confirm new password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        error={confirm !== '' && confirm !== next ? 'The passwords do not match' : undefined}
      />
      {result && <Banner {...result} />}
      <Button
        label={user.hasPassword ? 'Change password' : 'Set password'}
        onPress={save}
        busy={saving}
        disabled={
          !isStrongPassword(next) ||
          confirm !== next ||
          (user.hasPassword ? current === '' : ownerCode.length !== CODE_LENGTH)
        }
      />
    </SettingsSection>
  );
}
