import { StyleSheet, TextInput } from 'react-native';

import { Field } from '@/components/field';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const CODE_LENGTH = 6;

interface Props {
  value: string;
  onChange: (code: string) => void;
  onSubmit?: () => void;
}

/** One box for the 6-digit email code, so the keyboard can fill it in from a message in one go. */
export function CodeField({ value, onChange, onSubmit }: Props) {
  const theme = useTheme();
  return (
    <Field label="Code">
      <TextInput
        accessibilityLabel="Code"
        value={value}
        onChangeText={(typed) => onChange(typed.replace(/\D/g, '').slice(0, CODE_LENGTH))}
        onSubmitEditing={onSubmit}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={CODE_LENGTH}
        placeholder="000000"
        placeholderTextColor={theme.textMuted}
        selectionColor={theme.accent}
        style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
      />
    </Field>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: Radius.medium,
    fontFamily: Fonts.mono,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
  },
});
