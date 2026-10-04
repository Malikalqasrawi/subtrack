import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Subscription } from '@/api/types';
import { Avatar } from '@/components/avatar';
import { Card } from '@/components/card';
import { LoadError, Loading } from '@/components/screen-state';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { categoryLabel, cycleUnit, formatDate, formatMoney, relativeDay, statusLabel } from '@/lib/format';
import { useSubscriptions } from '@/lib/queries';

export default function SubscriptionsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: subscriptions, error, refetch, isRefetching } = useSubscriptions();

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>Subscriptions</Text>
          <Text style={{ color: theme.textSecondary }}>Everything you pay for on a schedule.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add subscription"
          hitSlop={8}
          onPress={() => router.push('/subscription/new')}
          style={({ pressed }) => [styles.add, { backgroundColor: theme.accent }, pressed && styles.pressed]}>
          <Feather name="plus" size={22} color={theme.onAccent} />
        </Pressable>
      </View>

      {!subscriptions && !error && <Loading />}
      {!subscriptions && error && <LoadError message={error.message} onRetry={refetch} />}
      {subscriptions && (
        <FlatList
          data={subscriptions}
          keyExtractor={(subscription) => subscription.id}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${item.name}`}
              onPress={() => router.push({ pathname: '/subscription/[id]', params: { id: item.id } })}
              style={({ pressed }) => pressed && styles.pressed}>
              <SubscriptionCard subscription={item} />
            </Pressable>
          )}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.accent} />}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.textSecondary }]}>
              You have not added any subscriptions yet. Tap + to add the first one.
            </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  add: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.medium,
  },
  pressed: {
    opacity: 0.85,
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
