import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppearanceSection } from '@/components/settings/appearance-section';
import { DangerZone } from '@/components/settings/danger-zone';
import { EmailSection } from '@/components/settings/email-section';
import { PasswordSection } from '@/components/settings/password-section';
import { ProfileSection } from '@/components/settings/profile-section';
import { SessionsSection } from '@/components/settings/sessions-section';
import { TwoFactorSection } from '@/components/settings/two-factor-section';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const theme = useTheme();
  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
        <Text style={{ color: theme.textSecondary }}>Your profile, sign-in and security.</Text>
      </View>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ProfileSection />
          <AppearanceSection />
          <EmailSection />
          <PasswordSection />
          <TwoFactorSection />
          <SessionsSection />
          <DangerZone />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
});
