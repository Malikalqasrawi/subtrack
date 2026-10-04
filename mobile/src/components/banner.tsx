import { StyleSheet, Text } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  message: string;
  tone?: 'error' | 'success';
}

export function Banner({ message, tone = 'error' }: Props) {
  const theme = useTheme();
  const colors =
    tone === 'error'
      ? { color: theme.danger, backgroundColor: theme.dangerSoft }
      : { color: theme.accent, backgroundColor: theme.accentSoft };
  return (
    <Text accessibilityRole="alert" style={[styles.banner, colors]}>
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  banner: {
    fontSize: 14,
    lineHeight: 20,
    padding: Spacing.three,
    borderRadius: Radius.small,
    overflow: 'hidden',
  },
});
