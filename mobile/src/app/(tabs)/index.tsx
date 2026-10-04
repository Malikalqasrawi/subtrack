import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CategorySpend, DashboardSummary, RenewalEntry } from '@/api/types';
import { Avatar } from '@/components/avatar';
import { Card } from '@/components/card';
import { LoadError, Loading } from '@/components/screen-state';
import { Fonts, Hero, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { categoryLabel, daysUntil, formatDate, formatMoney, relativeDay } from '@/lib/format';
import { useSummary } from '@/lib/queries';
import { useCurrentUser } from '@/session/session-context';

const UPCOMING_WINDOW_DAYS = 30;

export default function DashboardScreen() {
  const user = useCurrentUser();
  const theme = useTheme();
  const { data: summary, error, refetch, isRefetching } = useSummary();

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: theme.text }]}>
          {greetingFor(new Date().getHours())}, {user.displayName.split(' ')[0]}
        </Text>
        <Text style={{ color: theme.textSecondary }}>Here&apos;s where your money goes.</Text>
      </View>

      {!summary && !error && <Loading />}
      {!summary && error && <LoadError message={error.message} onRetry={refetch} />}
      {summary && (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.accent} />}>
          <HeroPanel summary={summary} />
          <Card>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Upcoming renewals</Text>
            <Text style={[styles.cardNote, { color: theme.textSecondary }]}>Next {UPCOMING_WINDOW_DAYS} days</Text>
            <UpcomingList upcoming={summary.upcoming} displayCurrency={summary.currency} />
          </Card>
          <Card>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Monthly spend by category</Text>
            <Text style={[styles.cardNote, { color: theme.textSecondary }]}>Average per month, in {summary.currency}.</Text>
            <CategoryBars categories={summary.byCategory} currency={summary.currency} />
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function greetingFor(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function HeroPanel({ summary }: { summary: DashboardSummary }) {
  const next = summary.upcoming[0];
  return (
    <View style={styles.hero}>
      <Text style={styles.heroLabel}>MONTHLY SPEND</Text>
      <Text style={styles.heroValue}>{formatMoney(summary.monthlyTotal, summary.currency)}</Text>
      <Text style={styles.heroNote}>Averaged across all billing cycles</Text>
      <View style={styles.heroTiles}>
        <HeroTile label="Per year" value={formatMoney(summary.yearlyTotal, summary.currency)} />
        <HeroTile label="Active" value={String(summary.activeCount)} />
        <HeroTile label="Next renewal" value={next ? `${next.name} · ${relativeDay(next.date).toLowerCase()}` : 'None in 30 days'} />
      </View>
    </View>
  );
}

function HeroTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroTile}>
      <Text style={styles.heroTileLabel}>{label}</Text>
      <Text style={styles.heroTileValue}>{value}</Text>
    </View>
  );
}

function UpcomingList({ upcoming, displayCurrency }: { upcoming: RenewalEntry[]; displayCurrency: string }) {
  const theme = useTheme();
  if (upcoming.length === 0) return <Text style={{ color: theme.textSecondary }}>Nothing renews in the next 30 days.</Text>;
  return (
    <View style={styles.list}>
      {upcoming.map((renewal) => {
        // How much of the 30-day window has already passed: fuller means sooner.
        const closeness = 1 - Math.max(0, daysUntil(renewal.date)) / UPCOMING_WINDOW_DAYS;
        return (
          <View key={renewal.subscriptionId + renewal.date} style={styles.row}>
            <Avatar name={renewal.name} size={38} />
            <View style={styles.rowMain}>
              <Text style={[styles.rowName, { color: theme.text }]} numberOfLines={1}>
                {renewal.name}
              </Text>
              <Text style={[styles.rowNote, { color: theme.textSecondary }]}>
                {relativeDay(renewal.date)} · {formatDate(renewal.date)}
              </Text>
              <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
                <View style={[styles.trackFill, { backgroundColor: theme.accent, width: `${Math.max(4, closeness * 100)}%` }]} />
              </View>
            </View>
            <View style={styles.rowAmount}>
              <Text style={[styles.money, { color: theme.text }]}>{formatMoney(renewal.amount, renewal.currency)}</Text>
              {renewal.currency !== displayCurrency && (
                <Text style={[styles.rowNote, { color: theme.textSecondary }]}>
                  ≈ {formatMoney(renewal.convertedAmount, displayCurrency)}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function CategoryBars({ categories, currency }: { categories: CategorySpend[]; currency: string }) {
  const theme = useTheme();
  const largest = Math.max(...categories.map((category) => category.monthlyAmount), 0.01);
  return (
    <View style={styles.list}>
      {categories.map((category) => (
        <View key={category.category} style={styles.category}>
          <View style={styles.categoryHead}>
            <Text style={{ color: theme.text }}>
              {categoryLabel(category.category)} <Text style={{ color: theme.textSecondary }}>· {category.count}</Text>
            </Text>
            <Text style={[styles.money, { color: theme.text }]}>{formatMoney(category.monthlyAmount, currency)}</Text>
          </View>
          <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
            <View style={[styles.trackFill, { backgroundColor: theme.accent, width: `${(category.monthlyAmount / largest) * 100}%` }]} />
          </View>
        </View>
      ))}
    </View>
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
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  hero: {
    backgroundColor: Hero.background,
    borderColor: Hero.border,
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  heroLabel: {
    color: Hero.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  heroValue: {
    color: Hero.value,
    fontFamily: Fonts.mono,
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1.5,
  },
  heroNote: {
    color: Hero.textSecondary,
    fontSize: 13,
  },
  heroTiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  heroTile: {
    backgroundColor: Hero.tile,
    borderColor: Hero.tileBorder,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
  heroTileLabel: {
    color: Hero.textSecondary,
    fontSize: 12,
  },
  heroTileValue: {
    color: Hero.text,
    fontSize: 15,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  cardNote: {
    fontSize: 13,
    marginBottom: Spacing.two,
  },
  list: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  rowMain: {
    flex: 1,
    gap: Spacing.one,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowNote: {
    fontSize: 13,
  },
  rowAmount: {
    alignItems: 'flex-end',
  },
  money: {
    fontFamily: Fonts.mono,
    fontWeight: '700',
    fontSize: 15,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  trackFill: {
    height: 4,
    borderRadius: 2,
  },
  category: {
    gap: Spacing.two,
  },
  categoryHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
