import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { SETTINGS, type SettingsEntry } from '@/components/settings/sections';
import { Radius, Spacing, TabBar } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCurrentUser } from '@/session/session-context';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const user = useCurrentUser();
  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
        <Text style={{ color: theme.textSecondary }}>Your profile, sign-in and security.</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.menu}>
          {SETTINGS.map((entry, index) => (
            <View key={entry.key}>
              {index > 0 && <View style={[styles.separator, { backgroundColor: theme.border }]} />}
              <MenuRow
                entry={entry}
                summary={entry.summary(user)}
                onPress={() => router.push({ pathname: '/settings/[section]', params: { section: entry.key } })}
              />
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuRow({ entry, summary, onPress }: { entry: SettingsEntry; summary: string; onPress: () => void }) {
  const theme = useTheme();
  const color = entry.danger ? theme.danger : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.label}, ${summary}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.icon, { backgroundColor: theme.surfaceAlt }]}>
        <Feather name={entry.icon} size={18} color={entry.danger ? theme.danger : theme.accent} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color }]}>{entry.label}</Text>
        <Text style={[styles.rowSummary, { color: theme.textSecondary }]} numberOfLines={1}>
          {summary}
        </Text>
      </View>
      <Feather name="chevron-right" size={20} color={theme.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.half,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: TabBar.clearance,
  },
  menu: {
    paddingVertical: Spacing.one,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  icon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.medium,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  rowSummary: {
    fontSize: 13,
  },
});
