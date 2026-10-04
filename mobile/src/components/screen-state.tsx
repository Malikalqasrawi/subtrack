import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Loading() {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.accent} size="large" />
    </View>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
      <Button label="Try again" variant="ghost" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
  },
});
