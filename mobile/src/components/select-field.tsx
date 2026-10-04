import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Field } from '@/components/field';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props<T> {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  error?: string;
}

/** A field that opens a sheet with the options, for lists too long to show as chips. */
export function SelectField<T extends string | number | null>({ label, options, value, onChange, error }: Props<T>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  function choose(next: T) {
    onChange(next);
    setOpen(false);
  }

  return (
    <Field label={label} error={error}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? value}`}
        onPress={() => setOpen(true)}
        style={[styles.input, { backgroundColor: theme.surface, borderColor: error ? theme.danger : theme.border }]}>
        <Text style={[styles.value, { color: theme.text }]} numberOfLines={1}>
          {selected?.label ?? value}
        </Text>
        <Feather name="chevron-down" size={18} color={theme.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable accessibilityLabel="Close" style={styles.backdrop} onPress={() => setOpen(false)} />
          <View
            style={[
              styles.sheet,
              { backgroundColor: theme.surface, borderColor: theme.border, paddingBottom: insets.bottom + Spacing.two },
            ]}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(option) => String(option.value)}
              renderItem={({ item }) => {
                const current = item.value === value;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: current }}
                    onPress={() => choose(item.value)}
                    style={({ pressed }) => [styles.option, pressed && { backgroundColor: theme.surfaceAlt }]}>
                    <Text style={[styles.optionLabel, { color: current ? theme.accent : theme.text }]}>{item.label}</Text>
                    {current && <Feather name="check" size={18} color={theme.accent} />}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    maxHeight: '60%',
    borderTopWidth: 1,
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    paddingTop: Spacing.three,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  option: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
  },
  optionLabel: {
    fontSize: 16,
  },
});
