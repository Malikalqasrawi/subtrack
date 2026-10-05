import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { Category } from '@/api/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { categoryColors, categoryIcon } from '@/lib/categories';

export function CategoryIcon({ category, size = 42 }: { category: Category; size?: number }) {
  const colors = categoryColors(category, useColorScheme() === 'dark');
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.3, backgroundColor: colors.tile }]}>
      <Feather name={categoryIcon(category)} size={size * 0.46} color={colors.ink} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
