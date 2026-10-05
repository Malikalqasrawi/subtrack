import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBar } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          position: 'absolute',
          marginHorizontal: TabBar.margin,
          bottom: insets.bottom + TabBar.margin / 2,
          height: TabBar.height,
          paddingBottom: 8,
          paddingTop: 8,
          borderRadius: TabBar.height / 2,
          borderTopWidth: 1,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.surface,
          elevation: 8,
          shadowColor: '#000000',
          shadowOpacity: 0.2,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="subscriptions"
        options={{ title: 'Subscriptions', tabBarIcon: ({ color, size }) => <Feather name="layers" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: 'Calendar', tabBarIcon: ({ color, size }) => <Feather name="calendar" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Feather name="settings" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
