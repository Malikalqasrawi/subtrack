import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { ApiError } from '@/api/client';
import { userApi } from '@/api/endpoints';
import { Banner, type BannerProps } from '@/components/banner';
import { Button } from '@/components/button';
import { SelectField } from '@/components/select-field';
import { SettingsSection } from '@/components/settings/section';
import { TextField } from '@/components/text-field';
import { errorMessage } from '@/lib/errors';
import { isValidPhone, normalizePhone } from '@/lib/password';
import { useCurrencies } from '@/lib/queries';
import { useCurrentUser, useSession } from '@/session/session-context';

export function ProfileSection() {
  const user = useCurrentUser();
  const { updateUser } = useSession();
  const queryClient = useQueryClient();
  const { data: currencies } = useCurrencies();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [phone, setPhone] = useState(user.phoneNumber ?? '');
  const [defaultCurrency, setDefaultCurrency] = useState(user.defaultCurrency);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<BannerProps>();
  const [saving, setSaving] = useState(false);

  // Until the list arrives the picker still offers the currency already on the account.
  const currencyOptions = (currencies ?? [defaultCurrency]).map((currency) => ({ value: currency, label: currency }));

  async function save() {
    setResult(undefined);
    if (!isValidPhone(phone)) {
      setFieldErrors({ phoneNumber: 'Use international format, for example +962791234567' });
      return;
    }
    setFieldErrors({});
    setSaving(true);
    try {
      updateUser(await userApi.update(displayName.trim(), normalizePhone(phone), defaultCurrency));
      // Totals are converted to the default currency, so everything loaded so far may be out of date.
      queryClient.invalidateQueries();
      setResult({ tone: 'success', message: 'Profile saved' });
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) setFieldErrors(err.fieldErrors);
      else setResult({ message: errorMessage(err, 'Could not save your profile') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsSection title="Profile" note={`Signed in as ${user.email}`}>
      <TextField
        label="Name"
        value={displayName}
        onChangeText={setDisplayName}
        autoComplete="name"
        textContentType="name"
        maxLength={80}
        error={fieldErrors.displayName}
      />
      <TextField
        label="Phone number"
        value={phone}
        onChangeText={setPhone}
        autoComplete="tel"
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        maxLength={24}
        hint="With country code, for example +962 79 123 4567"
        error={fieldErrors.phoneNumber}
      />
      <SelectField
        label="Default currency"
        options={currencyOptions}
        value={defaultCurrency}
        onChange={setDefaultCurrency}
        hint="Totals and charts are converted to this currency."
        error={fieldErrors.defaultCurrency}
      />
      {result && <Banner {...result} />}
      <Button label="Save profile" onPress={save} busy={saving} disabled={displayName.trim() === ''} />
    </SettingsSection>
  );
}
