import { Feather } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';

import { Field } from '@/components/field';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, parseIsoDate, toIsoDate } from '@/lib/format';

interface Props {
  label: string;
  /** ISO date, yyyy-mm-dd */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
}

export function DateField({ label, value, onChange, error, hint }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const onPicked = (_event: unknown, date: Date) => onChange(toIsoDate(date));

  // Android shows its own dialog; iOS has no dialog, so the calendar opens under the field.
  function toggle() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: parseIsoDate(value), mode: 'date', onValueChange: onPicked });
    } else {
      setOpen((current) => !current);
    }
  }

  return (
    <Field label={label} error={error} hint={hint}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatDate(value)}`}
        onPress={toggle}
        style={[styles.input, { backgroundColor: theme.surface, borderColor: error ? theme.danger : theme.border }]}>
        <Text style={[styles.value, { color: theme.text }]}>{formatDate(value)}</Text>
        <Feather name="calendar" size={18} color={theme.textMuted} />
      </Pressable>
      {open && (
        <DateTimePicker value={parseIsoDate(value)} mode="date" display="inline" accentColor={theme.accent} onValueChange={onPicked} />
      )}
    </Field>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
  },
  value: {
    flex: 1,
    fontSize: 16,
  },
});
