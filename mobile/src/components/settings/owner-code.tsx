import { useState } from 'react';
import { Text } from 'react-native';

import { userApi } from '@/api/endpoints';
import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { CodeField } from '@/components/code-field';
import { TextLink } from '@/components/text-link';
import { useCooldown } from '@/hooks/use-cooldown';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/errors';
import { useCurrentUser } from '@/session/session-context';

const RESEND_COOLDOWN_SECONDS = 60;

interface Props {
  code: string;
  onChange: (code: string) => void;
}

/**
 * For accounts without a password: emails a code to the account's own address and takes it,
 * as the proof a password would otherwise give.
 */
export function OwnerCode({ code, onChange }: Props) {
  const theme = useTheme();
  const user = useCurrentUser();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const [cooldown, restartCooldown] = useCooldown(RESEND_COOLDOWN_SECONDS, false);

  async function send() {
    setSending(true);
    setError(undefined);
    try {
      await userApi.sendConfirmationCode();
      setSent(true);
      restartCooldown();
    } catch (err) {
      setError(errorMessage(err, 'Could not send the code'));
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Text style={{ color: theme.textSecondary }}>
        {sent
          ? `Enter the code we sent to ${user.email}.`
          : `This account has no password. To confirm it is you, we email a code to ${user.email}.`}
      </Text>
      {sent && <CodeField value={code} onChange={onChange} />}
      {error && <Banner message={error} />}
      {sent ? (
        <TextLink
          label={cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          onPress={send}
          disabled={cooldown > 0 || sending}
        />
      ) : (
        <Button label="Email me a code" variant="ghost" onPress={send} busy={sending} />
      )}
    </>
  );
}
