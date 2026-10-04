import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export function TextLink({ label, onPress, disabled }: Props) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="link" accessibilityState={{ disabled }} disabled={disabled} hitSlop={8} onPress={onPress}>
      <Text style={[styles.label, { color: disabled ? theme.textMuted : theme.accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
});
