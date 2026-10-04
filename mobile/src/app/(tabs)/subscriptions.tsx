import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Subscription } from '@/api/types';
import { Avatar } from '@/components/avatar';
import { Card } from '@/components/card';
import { LoadError, Loading } from '@/components/screen-state';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { categoryLabel, cycleUnit, formatDate, formatMoney, relativeDay, statusLabel } from '@/lib/format';
import { useSubscriptions } from '@/lib/queries';

export default function SubscriptionsScreen() {
  const theme = useTheme();
  const { data: subscriptions, error, refetch, isRefetching } = useSubscriptions();

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Subscriptions</Text>
        <Text style={{ color: theme.textSecondary }}>Everything you pay for on a schedule.</Text>
      </View>

      {!subscriptions && !error && <Loading />}
      {!subscriptions && error && <LoadError message={error.message} onRetry={refetch} />}
      {subscriptions && (
        <FlatList
          data={subscriptions}
          keyExtractor={(subscription) => subscription.id}
          renderItem={({ item }) => <SubscriptionCard subscription={item} />}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.accent} />}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.textSecondary }]}>You have not added any subscriptions yet.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

function SubscriptionCard({ subscription }: { subscription: Subscription }) {
  const theme = useTheme();
  const active = subscription.status === 'ACTIVE';
  const showMonthly = subscription.currency !== subscription.displayCurrency || subscription.billingCycle !== 'MONTHLY';
  return (
    <Card style={!active && styles.inactive}>
      <View style={styles.cardTop}>
        <Avatar name={subscription.name} />
        <View style={styles.cardMain}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {subscription.name}
          </Text>
          <Text style={[styles.note, { color: theme.textSecondary }]}>{categoryLabel(subscription.category)}</Text>
        </View>
        {!active && (
          <Text style={[styles.badge, { color: theme.textSecondary, backgroundColor: theme.surfaceAlt }]}>
            {statusLabel(subscription.status)}
          </Text>
        )}
      </View>
      <Text style={[styles.price, { color: theme.text }]}>
        {formatMoney(subscription.amount, subscription.currency)}
        <Text style={[styles.cycle, { color: theme.textSecondary }]}> / {cycleUnit(subscription.billingCycle)}</Text>
      </Text>
      <Text style={[styles.note, { color: theme.textSecondary }]}>
        {showMonthly && `≈ ${formatMoney(subscription.monthlyCost, subscription.displayCurrency)} / month · `}
        {subscription.nextRenewalDate
          ? `Renews ${relativeDay(subscription.nextRenewalDate).toLowerCase()} (${formatDate(subscription.nextRenewalDate)})`
          : 'No upcoming renewal'}
      </Text>
    </Card>
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
  empty: {
    textAlign: 'center',
    marginTop: Spacing.five,
  },
  inactive: {
    opacity: 0.7,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  cardMain: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 13,
  },
  badge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
    overflow: 'hidden',
  },
  price: {
    fontFamily: Fonts.mono,
    fontSize: 20,
    fontWeight: '700',
    marginTop: Spacing.two,
  },
  cycle: {
    fontSize: 14,
    fontWeight: '400',
  },
});
