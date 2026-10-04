import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  title: string;
  note?: string;
  children: ReactNode;
}

export function SettingsSection({ title, note, children }: Props) {
  const theme = useTheme();
  return (
    <Card>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
        {title}
      </Text>
      {note && <Text style={[styles.note, { color: theme.textSecondary }]}>{note}</Text>}
      <View style={styles.body}>{children}</View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  note: {
    fontSize: 13,
    lineHeight: 18,
  },
  body: {
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
});
