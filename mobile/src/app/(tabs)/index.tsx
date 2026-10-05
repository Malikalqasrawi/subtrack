import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CategorySpend, DashboardSummary, MonthlyProjection, RenewalEntry } from '@/api/types';
import { Card } from '@/components/card';
import { CategoryIcon } from '@/components/category-icon';
import { DonutChart } from '@/components/donut-chart';
import { LineChart } from '@/components/line-chart';
import { RenewalTag } from '@/components/renewal-tag';
import { LoadError, Loading } from '@/components/screen-state';
import { Fonts, Hero, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { categoryColors } from '@/lib/categories';
import { categoryLabel, formatDate, formatMoney, parseIsoDate } from '@/lib/format';
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
            <Text style={[styles.cardTitle, { color: theme.text }]}>Where it goes</Text>
            <Text style={[styles.cardNote, { color: theme.textSecondary }]}>Average per month, in {summary.currency}.</Text>
            <CategoryBreakdown categories={summary.byCategory} currency={summary.currency} />
          </Card>
          <Card>
            <Text style={[styles.cardTitle, { color: theme.text }]}>The next 12 months</Text>
            <Text style={[styles.cardNote, { color: theme.textSecondary }]}>What each month will charge you.</Text>
            <Projection projection={summary.projection} currency={summary.currency} />
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
  return (
    <View style={styles.hero}>
      <Text style={styles.heroLabel}>MONTHLY SPEND</Text>
      <Text style={styles.heroValue}>{formatMoney(summary.monthlyTotal, summary.currency)}</Text>
      <Text style={styles.heroNote}>Averaged across all billing cycles</Text>
      <View style={styles.heroTiles}>
        <HeroTile label="Per year" value={formatMoney(summary.yearlyTotal, summary.currency)} />
        <HeroTile label="Active" value={String(summary.activeCount)} />
      </View>
    </View>
  );
}

function HeroTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroTile}>
      <Text style={styles.heroTileLabel}>{label}</Text>
      <Text style={styles.heroTileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function UpcomingList({ upcoming, displayCurrency }: { upcoming: RenewalEntry[]; displayCurrency: string }) {
  const theme = useTheme();
  if (upcoming.length === 0) return <Text style={{ color: theme.textSecondary }}>Nothing renews in the next 30 days.</Text>;
  return (
    <View style={styles.list}>
      {upcoming.map((renewal) => (
        <View key={renewal.subscriptionId + renewal.date} style={styles.row}>
          <CategoryIcon category={renewal.category} />
          <View style={styles.rowMain}>
            <Text style={[styles.rowName, { color: theme.text }]} numberOfLines={1}>
              {renewal.name}
            </Text>
            <Text style={[styles.rowNote, { color: theme.textSecondary }]}>{formatDate(renewal.date)}</Text>
          </View>
          <View style={styles.rowAmount}>
            <Text style={[styles.money, { color: theme.text }]}>{formatMoney(renewal.amount, renewal.currency)}</Text>
            {renewal.currency !== displayCurrency && (
              <Text style={[styles.rowNote, { color: theme.textSecondary }]}>
                ≈ {formatMoney(renewal.convertedAmount, displayCurrency)}
              </Text>
            )}
            <RenewalTag date={renewal.date} />
          </View>
        </View>
      ))}
    </View>
  );
}

function CategoryBreakdown({ categories, currency }: { categories: CategorySpend[]; currency: string }) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const total = categories.reduce((sum, category) => sum + category.monthlyAmount, 0);
  if (total <= 0) return <Text style={{ color: theme.textSecondary }}>Add a subscription to see where your money goes.</Text>;

  const colored = categories.map((category) => ({ ...category, color: categoryColors(category.category, dark).solid }));
  return (
    <View style={styles.breakdown}>
      <DonutChart
        accessibilityLabel={`Spend across ${categories.length} categories`}
        segments={colored.map((category) => ({ value: category.monthlyAmount, color: category.color }))}>
        <Text style={[styles.donutValue, { color: theme.text }]}>{categories.length}</Text>
        <Text style={[styles.rowNote, { color: theme.textSecondary }]}>{categories.length === 1 ? 'category' : 'categories'}</Text>
      </DonutChart>
      <View style={styles.legend}>
        {colored.map((category) => (
          <View key={category.category} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: category.color }]} />
            <View style={styles.rowMain}>
              <Text style={[styles.legendName, { color: theme.text }]} numberOfLines={1}>
                {categoryLabel(category.category)}
              </Text>
              <Text style={[styles.legendAmount, { color: theme.textSecondary }]}>
                {formatMoney(category.monthlyAmount, currency)}
              </Text>
            </View>
            <Text style={[styles.legendShare, { color: theme.textSecondary }]}>
              {Math.round((category.monthlyAmount / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const shortMonth = (yearMonth: string) => parseIsoDate(`${yearMonth}-01`).toLocaleDateString(undefined, { month: 'short' });

function Projection({ projection, currency }: { projection: MonthlyProjection[]; currency: string }) {
  const theme = useTheme();
  if (projection.length === 0) return null;
  const busiest = projection.reduce((highest, month) => (month.amount > highest.amount ? month : highest));
  const total = projection.reduce((sum, month) => sum + month.amount, 0);
  return (
    <View style={styles.list}>
      <LineChart
        accessibilityLabel={`Charges for the next ${projection.length} months`}
        points={projection.map((month) => ({ label: shortMonth(month.month), value: month.amount }))}
      />
      <View style={styles.facts}>
        <Fact label="In total" value={formatMoney(total, currency)} />
        <Fact label={`Busiest: ${shortMonth(busiest.month)}`} value={formatMoney(busiest.amount, currency)} />
      </View>
      <Text style={[styles.rowNote, { color: theme.textMuted }]}>Yearly charges show up in the month they are due.</Text>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.fact, { backgroundColor: theme.surfaceAlt }]}>
      <Text style={[styles.rowNote, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.money, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
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
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  heroTile: {
    flex: 1,
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
    fontFamily: Fonts.mono,
    fontSize: 16,
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
    gap: Spacing.half,
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
    gap: Spacing.half,
  },
  money: {
    fontFamily: Fonts.mono,
    fontWeight: '700',
    fontSize: 15,
  },
  breakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  donutValue: {
    fontFamily: Fonts.mono,
    fontSize: 26,
    fontWeight: '700',
  },
  legend: {
    flex: 1,
    gap: Spacing.two,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendName: {
    fontSize: 14,
    fontWeight: '600',
  },
  legendAmount: {
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
  legendShare: {
    fontFamily: Fonts.mono,
    fontSize: 13,
  },
  facts: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  fact: {
    flex: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
});
