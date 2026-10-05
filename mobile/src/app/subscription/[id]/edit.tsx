import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { SubscriptionForm } from '@/components/subscription-form';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLoadedSubscription } from '@/lib/queries';

export default function EditSubscriptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const subscription = useLoadedSubscription(id);
  const theme = useTheme();
  const router = useRouter();

  if (!subscription) {
    return (
      <SafeAreaView style={[styles.missing, { backgroundColor: theme.background }]}>
        <Text style={[styles.message, { color: theme.textSecondary }]}>This subscription no longer exists.</Text>
        <Button label="Go back" variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return <SubscriptionForm subscription={subscription} />;
}

const styles = StyleSheet.create({
  missing: {
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
