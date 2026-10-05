import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { authApi } from '@/api/endpoints';
import type { AuthResponse } from '@/api/types';
import { Button } from '@/components/button';
import { GoogleLogo } from '@/components/google-logo';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { requestGoogleIdToken } from '@/lib/google-sign-in';

interface Props {
  onResult: (result: AuthResponse) => void | Promise<void>;
  /** Called with nothing when a new attempt starts, so an older message is cleared. */
  onError: (message?: string) => void;
  disabled?: boolean;
}

export function GoogleButton({ onResult, onError, disabled }: Props) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    onError(undefined);
    try {
      const idToken = await requestGoogleIdToken();
      if (idToken) await onResult(await authApi.google(idToken));
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not sign in with Google');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: theme.border }]} />
        <Text style={{ color: theme.textMuted }}>or</Text>
        <View style={[styles.line, { backgroundColor: theme.border }]} />
      </View>
      <Button label="Continue with Google" variant="ghost" icon={<GoogleLogo />} onPress={signIn} busy={busy} disabled={disabled} />
    </>
  );
}

const styles = StyleSheet.create({
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
});
