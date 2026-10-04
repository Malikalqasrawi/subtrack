import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, error, hint, children }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      {children}
      {error ? (
        <Text accessibilityRole="alert" style={[styles.note, { color: theme.danger }]}>
          {error}
        </Text>
      ) : (
        hint && <Text style={[styles.note, { color: theme.textMuted }]}>{hint}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  note: {
    fontSize: 13,
  },
});
