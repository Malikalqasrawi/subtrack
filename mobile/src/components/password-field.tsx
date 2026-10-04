import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Field } from '@/components/field';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PASSWORD_RULES } from '@/lib/password';

interface Props {
  label: string;
  value: string;
  onChange: (password: string) => void;
  autoComplete: 'current-password' | 'new-password';
  error?: string;
  /** Shows the password rules and ticks each one off as it is met. */
  showRules?: boolean;
  onSubmit?: () => void;
}

export function PasswordField({ label, value, onChange, autoComplete, error, showRules, onSubmit }: Props) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} error={error}>
      <View style={[styles.input, { backgroundColor: theme.surface, borderColor: error ? theme.danger : theme.border }]}>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChange}
          onSubmitEditing={onSubmit}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={autoComplete}
          textContentType={autoComplete === 'new-password' ? 'newPassword' : 'password'}
          maxLength={72}
          placeholderTextColor={theme.textMuted}
          selectionColor={theme.accent}
          style={[styles.text, { color: theme.text }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          hitSlop={10}
          onPress={() => setVisible((current) => !current)}>
          <Feather name={visible ? 'eye-off' : 'eye'} size={18} color={theme.textMuted} />
        </Pressable>
      </View>
      {showRules && (
        <View style={styles.rules}>
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(value);
            return (
              <View key={rule.label} style={styles.rule} accessibilityLabel={`${rule.label}: ${met ? 'met' : 'not met'}`}>
                <Feather name={met ? 'check-circle' : 'circle'} size={14} color={met ? theme.accent : theme.textMuted} />
                <Text style={[styles.ruleLabel, { color: met ? theme.text : theme.textMuted }]}>{rule.label}</Text>
              </View>
            );
          })}
        </View>
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
  text: {
    flex: 1,
    fontSize: 16,
  },
  rules: {
    gap: Spacing.one,
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  ruleLabel: {
    fontSize: 13,
  },
});
