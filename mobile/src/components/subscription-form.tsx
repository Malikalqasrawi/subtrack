import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { BILLING_CYCLES, CATEGORIES, STATUSES, type Subscription } from '@/api/types';
import { Button } from '@/components/button';
import { Chips } from '@/components/chips';
import { DateField } from '@/components/date-field';
import { Field } from '@/components/field';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { categoryLabel, cycleLabel, statusLabel } from '@/lib/format';
import { useCurrencies, useSaveSubscription } from '@/lib/queries';
import {
  PRESETS,
  REMINDER_OPTIONS,
  initialValues,
  toRequest,
  validate,
  type FieldErrors,
  type SubscriptionFormValues,
} from '@/lib/subscription-form';
import { useCurrentUser } from '@/session/session-context';

const CYCLE_OPTIONS = BILLING_CYCLES.map((cycle) => ({ value: cycle, label: cycleLabel(cycle) }));
const STATUS_OPTIONS = STATUSES.map((status) => ({ value: status, label: statusLabel(status) }));
const CATEGORY_OPTIONS = CATEGORIES.map((category) => ({ value: category, label: categoryLabel(category) }));
const PRESET_OPTIONS = PRESETS.map((preset) => ({ value: preset.name, label: preset.name }));

interface Props {
  /** The subscription to edit, or undefined to add a new one. */
  subscription?: Subscription;
}

export function SubscriptionForm({ subscription }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const user = useCurrentUser();
  const { data: currencies } = useCurrencies();
  const [values, setValues] = useState(() => initialValues(subscription, user.defaultCurrency));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string>();
  const save = useSaveSubscription();

  const set =
    <Key extends keyof SubscriptionFormValues>(field: Key) =>
    (value: SubscriptionFormValues[Key]) =>
      setValues((current) => ({ ...current, [field]: value }));

  // Until the list arrives the picker still offers the currency already on the form.
  const currencyOptions = (currencies ?? [values.currency]).map((currency) => ({ value: currency, label: currency }));

  function applyPreset(name: string) {
    const preset = PRESETS.find((candidate) => candidate.name === name);
    if (preset) setValues((current) => ({ ...current, name: preset.name, category: preset.category }));
  }

  async function submit() {
    const errors = validate(values);
    setFieldErrors(errors);
    setError(undefined);
    if (Object.keys(errors).length > 0) return;
    try {
      await save.mutateAsync({ id: subscription?.id, request: toRequest(values) });
      router.back();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) setFieldErrors(err.fieldErrors);
      else setError(err instanceof Error ? err.message : 'Could not save the subscription');
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{subscription ? 'Edit subscription' : 'Add subscription'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={() => router.back()}>
          <Feather name="x" size={24} color={theme.textMuted} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!subscription && (
            <Chips
              accessibilityLabel="Popular services"
              options={PRESET_OPTIONS}
              value={PRESETS.some((preset) => preset.name === values.name) ? values.name : undefined}
              onChange={applyPreset}
            />
          )}

          <TextField
            label="Name"
            value={values.name}
            onChangeText={set('name')}
            placeholder="Netflix"
            maxLength={100}
            error={fieldErrors.name}
          />

          <View style={styles.row}>
            <View style={styles.grow}>
              <TextField
                label="Price"
                value={values.amount}
                onChangeText={set('amount')}
                placeholder="9.99"
                keyboardType="decimal-pad"
                maxLength={13}
                style={{ fontFamily: Fonts.mono }}
                error={fieldErrors.amount}
              />
            </View>
            <View style={styles.currency}>
              <SelectField
                label="Currency"
                options={currencyOptions}
                value={values.currency}
                onChange={set('currency')}
                error={fieldErrors.currency}
              />
            </View>
          </View>

          <Field label="Billed" error={fieldErrors.billingCycle}>
            <Chips accessibilityLabel="Billed" options={CYCLE_OPTIONS} value={values.billingCycle} onChange={set('billingCycle')} />
          </Field>

          <SelectField
            label="Category"
            options={CATEGORY_OPTIONS}
            value={values.category}
            onChange={set('category')}
            error={fieldErrors.category}
          />

          <DateField
            label="First billing date"
            value={values.firstBillingDate}
            onChange={set('firstBillingDate')}
            hint="Any past or upcoming charge date. Renewals are counted from it."
            error={fieldErrors.firstBillingDate}
          />

          <SelectField
            label="Email reminder"
            options={REMINDER_OPTIONS}
            value={values.reminderDaysBefore}
            onChange={set('reminderDaysBefore')}
            error={fieldErrors.reminderDaysBefore}
          />

          <Field label="Status" error={fieldErrors.status}>
            <Chips accessibilityLabel="Status" options={STATUS_OPTIONS} value={values.status} onChange={set('status')} />
          </Field>

          <TextField
            label="Website (optional)"
            value={values.websiteUrl}
            onChangeText={set('websiteUrl')}
            placeholder="https://"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            maxLength={255}
            error={fieldErrors.websiteUrl}
          />

          <TextField
            label="Notes (optional)"
            value={values.notes}
            onChangeText={set('notes')}
            multiline
            maxLength={500}
            error={fieldErrors.notes}
          />

          {error && (
            <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger, backgroundColor: theme.dangerSoft }]}>
              {error}
            </Text>
          )}

          <Button label="Save" onPress={submit} busy={save.isPending} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  grow: {
    flex: 1,
  },
  currency: {
    width: 120,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    padding: Spacing.three,
    borderRadius: Radius.small,
    overflow: 'hidden',
  },
});
