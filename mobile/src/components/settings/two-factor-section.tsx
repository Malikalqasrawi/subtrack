import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { twoFactorApi } from '@/api/endpoints';
import type { TwoFactorSetup } from '@/api/types';
import { Banner, type BannerProps } from '@/components/banner';
import { Button } from '@/components/button';
import { CODE_LENGTH, CodeField } from '@/components/code-field';
import { PasswordField } from '@/components/password-field';
import { SettingsSection } from '@/components/settings/section';
import { TextField } from '@/components/text-field';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/errors';
import { useCurrentUser, useSession } from '@/session/session-context';

/** A message, shown next to the button it is about; next to the main action when `beside` is not set. */
type Notice = BannerProps & { beside?: 'app' | 'copy' };

/** "AAAABBBBCCCCDDDD" -> "AAAA BBBB CCCC DDDD", easier to type by hand. */
const inGroupsOfFour = (key: string) => key.match(/.{1,4}/g)?.join(' ') ?? key;

export function TwoFactorSection() {
  const theme = useTheme();
  const user = useCurrentUser();
  const { updateUser } = useSession();
  const [setup, setSetup] = useState<TwoFactorSetup>();
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>();
  const [turningOff, setTurningOff] = useState(false);
  const [confirmingPassword, setConfirmingPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<Notice>();
  const [busy, setBusy] = useState(false);

  /** Runs one request, showing why if it fails. */
  async function run(action: () => Promise<void>, failure: string) {
    setBusy(true);
    setResult(undefined);
    try {
      await action();
    } catch (err) {
      setResult({ message: errorMessage(err, failure) });
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  const begin = () =>
    run(async () => {
      setSetup(await twoFactorApi.setup(password));
      setConfirmingPassword(false);
      setPassword('');
    }, 'Could not start two-factor setup');

  const enable = () =>
    run(async () => {
      const enabled = await twoFactorApi.enable(code);
      setRecoveryCodes(enabled.recoveryCodes);
      setSetup(undefined);
      setCode('');
      updateUser({ ...user, twoFactorEnabled: true });
      setResult({ tone: 'success', message: 'Two-factor authentication is on' });
    }, 'Could not turn on two-factor authentication');

  const disable = () =>
    run(async () => {
      await twoFactorApi.disable(code);
      setTurningOff(false);
      setRecoveryCodes(undefined);
      setCode('');
      updateUser({ ...user, twoFactorEnabled: false });
      setResult({ tone: 'success', message: 'Two-factor authentication is off' });
    }, 'Could not turn off two-factor authentication');

  async function copy(text: string, copied: string) {
    await Clipboard.setStringAsync(text);
    setResult({ beside: 'copy', tone: 'success', message: copied });
  }

  async function openAuthenticator(otpauthUri: string) {
    setResult(undefined);
    try {
      await Linking.openURL(otpauthUri);
    } catch {
      setResult({
        beside: 'app',
        message: 'No authenticator app was found on this phone. Install one, or use the key or the QR code.',
      });
    }
  }

  function cancel() {
    setSetup(undefined);
    setConfirmingPassword(false);
    setTurningOff(false);
    setPassword('');
    setCode('');
    setResult(undefined);
  }

  const noticeBeside = (place?: Notice['beside']) =>
    result !== undefined && result.beside === place && <Banner message={result.message} tone={result.tone} />;
  const notice = noticeBeside();
  const step = [styles.step, { color: theme.textSecondary }];

  return (
    <SettingsSection
      title="Two-factor authentication"
      trailing={<StatusBadge on={user.twoFactorEnabled} />}
      note="Optional. When it's on, signing in also asks for a code from an authenticator app such as Google Authenticator, Authy or 1Password.">
      {recoveryCodes && (
        <>
          {notice}
          <View style={[styles.recovery, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
            <Text style={[styles.recoveryTitle, { color: theme.text }]}>Save these recovery codes</Text>
            <Text style={step}>Each one signs you in once if you lose your phone. They will not be shown again.</Text>
            <View style={styles.codes}>
              {recoveryCodes.map((recoveryCode) => (
                <Text key={recoveryCode} selectable style={[styles.recoveryCode, { color: theme.text }]}>
                  {recoveryCode}
                </Text>
              ))}
            </View>
          </View>
          {noticeBeside('copy')}
          <Button label="Copy codes" variant="ghost" onPress={() => copy(recoveryCodes.join('\n'), 'Recovery codes copied')} />
          <Button label="I've saved them" onPress={() => setRecoveryCodes(undefined)} />
        </>
      )}

      {!user.twoFactorEnabled && !setup && !confirmingPassword && (
        <>
          {notice}
          <Button
            label="Set up two-factor"
            onPress={() => (user.hasPassword ? setConfirmingPassword(true) : begin())}
            busy={busy}
          />
        </>
      )}

      {!user.twoFactorEnabled && !setup && confirmingPassword && (
        <>
          <PasswordField
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            onSubmit={begin}
          />
          {notice}
          <Button label="Continue" onPress={begin} busy={busy} disabled={password === ''} />
          <Button label="Cancel" variant="ghost" onPress={cancel} disabled={busy} />
        </>
      )}

      {!user.twoFactorEnabled && setup && (
        <>
          <Text style={step}>1. Add Subtrack to your authenticator app. On this phone, this button does it for you:</Text>
          <Button label="Open authenticator app" variant="ghost" onPress={() => openAuthenticator(setup.otpauthUri)} />
          {noticeBeside('app')}
          <Text style={step}>If the app is on another device, scan this code with it:</Text>
          {/* Always dark on white, whatever the theme, so a camera can read it. */}
          <View accessibilityLabel="QR code for your authenticator app" style={styles.qr}>
            <QRCode value={setup.otpauthUri} size={168} />
          </View>
          <Text style={step}>Or type this key by hand:</Text>
          <Text selectable style={[styles.key, { color: theme.text, backgroundColor: theme.surfaceAlt }]}>
            {inGroupsOfFour(setup.secret)}
          </Text>
          <Button label="Copy key" variant="ghost" onPress={() => copy(setup.secret, 'Key copied')} />
          {noticeBeside('copy')}
          <Text style={step}>2. Enter the 6-digit code the app shows.</Text>
          <CodeField value={code} onChange={setCode} onSubmit={enable} />
          {notice}
          <Button label="Turn on" onPress={enable} busy={busy} disabled={code.length !== CODE_LENGTH} />
          <Button label="Cancel" variant="ghost" onPress={cancel} disabled={busy} />
        </>
      )}

      {user.twoFactorEnabled && !recoveryCodes && !turningOff && (
        <>
          {notice}
          <Button label="Turn off two-factor" variant="danger" onPress={() => setTurningOff(true)} />
        </>
      )}

      {user.twoFactorEnabled && !recoveryCodes && turningOff && (
        <>
          <TextField
            label="Authenticator or recovery code"
            value={code}
            onChangeText={(typed) => setCode(typed.trim())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={20}
            hint="Needed to confirm it's you."
          />
          {notice}
          <Button label="Turn off" variant="danger" onPress={disable} busy={busy} disabled={code.length < CODE_LENGTH} />
          <Button label="Cancel" variant="ghost" onPress={cancel} disabled={busy} />
        </>
      )}
    </SettingsSection>
  );
}

function StatusBadge({ on }: { on: boolean }) {
  const theme = useTheme();
  return (
    <Text
      style={[
        styles.badge,
        on ? { color: theme.accent, backgroundColor: theme.accentSoft } : { color: theme.textSecondary, backgroundColor: theme.surfaceAlt },
      ]}>
      {on ? 'On' : 'Off'}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
    overflow: 'hidden',
  },
  step: {
    fontSize: 14,
    lineHeight: 20,
  },
  qr: {
    alignSelf: 'center',
    padding: Spacing.three,
    borderRadius: Radius.medium,
    backgroundColor: '#FFFFFF',
  },
  key: {
    fontFamily: Fonts.mono,
    fontSize: 16,
    letterSpacing: 1,
    textAlign: 'center',
    padding: Spacing.three,
    borderRadius: Radius.small,
    overflow: 'hidden',
  },
  recovery: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  recoveryTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  codes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.four,
    rowGap: Spacing.one,
    marginTop: Spacing.one,
  },
  recoveryCode: {
    fontFamily: Fonts.mono,
    fontSize: 15,
  },
});
