import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { STATUSES, type Subscription } from '@/api/types';
import { Card } from '@/components/card';
import { Chips } from '@/components/chips';
import { RenewalTag } from '@/components/renewal-tag';
import { LoadError, Loading } from '@/components/screen-state';
import { ServiceIcon } from '@/components/service-icon';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { categoryLabel, cycleUnit, formatDate, formatMoney, statusLabel } from '@/lib/format';
import { useSubscriptions } from '@/lib/queries';
import {
  SORT_LABELS,
  monthlyTotal,
  nextSort,
  visibleSubscriptions,
  type Sort,
  type StatusFilter,
} from '@/lib/subscription-list';

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  ...STATUSES.map((status) => ({ value: status, label: statusLabel(status) })),
];

export default function SubscriptionsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: subscriptions, error, refetch, isRefetching } = useSubscriptions();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [sort, setSort] = useState<Sort>('renewal');

  const visible = visibleSubscriptions(subscriptions ?? [], query, status, sort);
  const displayCurrency = subscriptions?.[0]?.displayCurrency;

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Subscriptions</Text>
        <Text style={{ color: theme.textSecondary }}>
          {subscriptions && displayCurrency
            ? `${subscriptions.length} in total · ${formatMoney(monthlyTotal(subscriptions), displayCurrency)} a month`
            : 'Everything you pay for on a schedule.'}
        </Text>
      </View>

      {!subscriptions && !error && <Loading />}
      {!subscriptions && error && <LoadError message={error.message} onRetry={refetch} />}
      {subscriptions && (
        <FlatList
          data={visible}
          keyExtractor={(subscription) => subscription.id}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.controls}>
              <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Feather name="search" size={18} color={theme.textMuted} />
                <TextInput
                  accessibilityLabel="Search subscriptions"
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search subscriptions"
                  placeholderTextColor={theme.textMuted}
                  selectionColor={theme.accent}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  style={[styles.searchInput, { color: theme.text }]}
                />
                {query !== '' && (
                  <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => setQuery('')}>
                    <Feather name="x" size={18} color={theme.textMuted} />
                  </Pressable>
                )}
              </View>
              <Chips accessibilityLabel="Show" options={FILTERS} value={status} onChange={setStatus} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Sorted by ${SORT_LABELS[sort].toLowerCase()}. Change order`}
                hitSlop={8}
                onPress={() => setSort(nextSort(sort))}
                style={styles.sort}>
                <Feather name="bar-chart-2" size={16} color={theme.accent} style={styles.sortIcon} />
                <Text style={[styles.sortLabel, { color: theme.accent }]}>{SORT_LABELS[sort]}</Text>
              </Pressable>
            </View>
          }
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
              {subscriptions.length === 0
                ? 'You have not added any subscriptions yet. Tap + to add the first one.'
                : 'Nothing matches. Try another search or filter.'}
            </Text>
          }
        />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add subscription"
        onPress={() => router.push('/subscription/new')}
        style={({ pressed }) => [styles.add, { backgroundColor: theme.accent, shadowColor: theme.accent }, pressed && styles.pressed]}>
        <Feather name="plus" size={26} color={theme.onAccent} />
      </Pressable>
    </SafeAreaView>
  );
}

function SubscriptionCard({ subscription }: { subscription: Subscription }) {
  const theme = useTheme();
  const active = subscription.status === 'ACTIVE';
  const converted = subscription.currency !== subscription.displayCurrency || subscription.billingCycle !== 'MONTHLY';
  return (
    <Card style={[styles.card, !active && styles.inactive]}>
      <ServiceIcon name={subscription.name} category={subscription.category} size={46} />
      <View style={styles.cardMain}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {subscription.name}
        </Text>
        <Text style={[styles.note, { color: theme.textSecondary }]} numberOfLines={1}>
          {categoryLabel(subscription.category)}
        </Text>
        {subscription.nextRenewalDate ? (
          <View style={styles.renewal}>
            <RenewalTag date={subscription.nextRenewalDate} />
            <Text style={[styles.note, { color: theme.textMuted }]}>{formatDate(subscription.nextRenewalDate)}</Text>
          </View>
        ) : (
          <Text style={[styles.badge, { color: theme.textSecondary, backgroundColor: theme.surfaceAlt }]}>
            {statusLabel(subscription.status)}
          </Text>
        )}
      </View>
      <View style={styles.cardAmount}>
        <Text style={[styles.price, { color: theme.text }]}>{formatMoney(subscription.amount, subscription.currency)}</Text>
        <Text style={[styles.note, { color: theme.textSecondary }]}>per {cycleUnit(subscription.billingCycle)}</Text>
        {converted && (
          <Text style={[styles.converted, { color: theme.textMuted }]}>
            ≈ {formatMoney(subscription.monthlyCost, subscription.displayCurrency)}/mo
          </Text>
        )}
      </View>
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
  controls: {
    gap: Spacing.three,
  },
  search: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  sort: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
  },
  sortIcon: {
    transform: [{ rotate: '90deg' }],
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: Spacing.three,
    // Room for the add button, so it never covers the last card.
    paddingBottom: 96,
    gap: Spacing.three,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.five,
  },
  pressed: {
    opacity: 0.85,
  },
  add: {
    position: 'absolute',
    right: Spacing.three,
    bottom: Spacing.three,
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    elevation: 6,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  inactive: {
    opacity: 0.65,
  },
  cardMain: {
    flex: 1,
    gap: Spacing.one,
  },
  renewal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cardAmount: {
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 13,
  },
  converted: {
    fontFamily: Fonts.mono,
    fontSize: 11,
  },
  badge: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
    overflow: 'hidden',
  },
  price: {
    fontFamily: Fonts.mono,
    fontSize: 17,
    fontWeight: '700',
  },
});
