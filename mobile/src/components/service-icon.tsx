import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { Category } from '@/api/types';
import { CategoryIcon } from '@/components/category-icon';
import { useTheme } from '@/hooks/use-theme';
import { brandFor, inkOn } from '@/lib/brands';

interface Props {
  /** The subscription's name, which decides whether a brand logo is known for it. */
  name: string;
  category: Category;
  size?: number;
}

/** The service's own logo when the name is a known brand, the category icon otherwise. */
export function ServiceIcon({ name, category, size = 42 }: Props) {
  const theme = useTheme();
  const brand = brandFor(name);
  if (!brand) return <CategoryIcon category={category} size={size} />;
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: size * 0.3, backgroundColor: brand.color, borderColor: theme.border },
      ]}>
      <Svg width={size * 0.54} height={size * 0.54} viewBox="0 0 24 24">
        <Path d={brand.path} fill={inkOn(brand.color)} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    // Keeps black logos visible on the dark theme.
    borderWidth: StyleSheet.hairlineWidth,
  },
});
