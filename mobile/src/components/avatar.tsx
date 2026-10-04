import { StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { hueFor } from '@/lib/format';

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const dark = useColorScheme() !== 'light';
  const hue = hueFor(name);
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size * 0.28, backgroundColor: `hsl(${hue}, 40%, ${dark ? 22 : 90}%)` },
      ]}>
      <Text style={{ fontWeight: '700', fontSize: size * 0.4, color: `hsl(${hue}, ${dark ? 80 : 55}%, ${dark ? 82 : 30}%)` }}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
