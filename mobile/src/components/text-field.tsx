import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { Field } from '@/components/field';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = TextInputProps & { label: string; error?: string; hint?: string };

export function TextField({ label, error, hint, style, ...input }: Props) {
  const theme = useTheme();
  return (
    <Field label={label} error={error} hint={hint}>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.textMuted}
        selectionColor={theme.accent}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.surface, borderColor: error ? theme.danger : theme.border },
          input.multiline && styles.multiline,
          style,
        ]}
        {...input}
      />
    </Field>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  multiline: {
    minHeight: 88,
    paddingVertical: Spacing.three,
    textAlignVertical: 'top',
  },
});
