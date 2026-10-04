import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RenewalEntry } from '@/api/types';
import { Avatar } from '@/components/avatar';
import { Banner } from '@/components/banner';
import { Card } from '@/components/card';
import { TextLink } from '@/components/text-link';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { WEEKDAYS, addMonths, groupByDate, monthWeeks, startOfMonth } from '@/lib/calendar';
import { formatDate, formatMoney, toIsoDate } from '@/lib/format';
import { useCalendar } from '@/lib/queries';

const MAX_DOTS = 3;

const countLabel = (count: number) => `${count} ${count === 1 ? 'charge' : 'charges'}`;

export default function CalendarScreen() {
  const theme = useTheme();
  const [today] = useState(() => new Date());
  // The first day of the month being shown.
  const [month, setMonth] = useState(() => startOfMonth(today));
  // Tapping a day narrows the list under the grid to that day.
  const [selectedDate, setSelectedDate] = useState<string>();
  const { data: current, error, refetch, isRefetching } = useCalendar(month.getFullYear(), month.getMonth() + 1);

  const renewals = current?.renewals ?? [];
  const renewalsByDate = groupByDate(renewals);
  const listed = selectedDate ? (renewalsByDate.get(selectedDate) ?? []) : renewals;
  const todayIso = toIsoDate(today);

  function show(next: Date) {
    setSelectedDate(undefined);
    setMonth(next);
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>Calendar</Text>
          <Text style={{ color: theme.textSecondary }}>
            {current
              ? `${countLabel(renewals.length)} this month, ${formatMoney(current.total, current.currency)} in total.`
              : error
                ? 'Could not load this month.'
                : 'Loading…'}
          </Text>
        </View>
        <TextLink label="Today" onPress={() => show(startOfMonth(today))} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.accent} />}>
        <View style={styles.monthNav}>
          <MonthButton label="Previous month" icon="chevron-left" onPress={() => show(addMonths(month, -1))} />
          <Text style={[styles.monthLabel, { color: theme.text }]}>
            {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </Text>
          <MonthButton label="Next month" icon="chevron-right" onPress={() => show(addMonths(month, 1))} />
        </View>

        {error && <Banner message={error.message} />}

        <Card style={styles.grid}>
          <View style={styles.week}>
            {WEEKDAYS.map((weekday) => (
              <Text key={weekday} style={[styles.weekday, { color: theme.textMuted }]}>
                {weekday}
              </Text>
            ))}
          </View>
          {monthWeeks(month).map((week, row) => (
            <View key={row} style={styles.week}>
              {week.map((iso, column) =>
                iso ? (
                  <DayCell
                    key={iso}
                    iso={iso}
                    count={renewalsByDate.get(iso)?.length ?? 0}
                    isToday={iso === todayIso}
                    selected={iso === selectedDate}
                    onPress={() => setSelectedDate(iso === selectedDate ? undefined : iso)}
                  />
                ) : (
                  <View key={column} style={styles.day} />
                ),
              )}
            </View>
          ))}
        </Card>

        {current && (
          <Card>
            <View style={styles.listHead}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {selectedDate ? `Charges on ${formatDate(selectedDate)}` : 'Charges this month'}
              </Text>
              {selectedDate && <TextLink label="Show whole month" onPress={() => setSelectedDate(undefined)} />}
            </View>
            {listed.length === 0 ? (
              <Text style={{ color: theme.textSecondary }}>
                {selectedDate ? 'Nothing is charged on this day.' : 'Nothing is charged this month.'}
              </Text>
            ) : (
              <View style={styles.list}>
                {listed.map((renewal) => (
                  <RenewalRow key={renewal.subscriptionId + renewal.date} renewal={renewal} displayCurrency={current.currency} />
                ))}
              </View>
            )}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MonthButton({ label, icon, onPress }: { label: string; icon: 'chevron-left' | 'chevron-right'; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.monthButton,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <Feather name={icon} size={20} color={theme.text} />
    </Pressable>
  );
}

interface DayCellProps {
  /** yyyy-mm-dd */
  iso: string;
  count: number;
  isToday: boolean;
  selected: boolean;
  onPress: () => void;
}

function DayCell({ iso, count, isToday, selected, onPress }: DayCellProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${formatDate(iso)}, ${countLabel(count)}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.day, selected && { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
      <Text style={[styles.dayNumber, { color: isToday ? theme.accent : theme.text }, isToday && styles.todayNumber]}>
        {Number(iso.slice(8))}
      </Text>
      <View style={styles.dots}>
        {Array.from({ length: Math.min(count, MAX_DOTS) }, (_, index) => (
          <View key={index} style={[styles.dot, { backgroundColor: theme.accent }]} />
        ))}
      </View>
    </Pressable>
  );
}

function RenewalRow({ renewal, displayCurrency }: { renewal: RenewalEntry; displayCurrency: string }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Avatar name={renewal.name} size={38} />
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
      </View>
    </View>
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
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  monthButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
  grid: {
    padding: Spacing.two,
    gap: Spacing.one,
  },
  week: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: Spacing.one,
  },
  day: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: Radius.small,
  },
  dayNumber: {
    fontSize: 15,
  },
  todayNumber: {
    fontWeight: '800',
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
    height: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  listHead: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
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
});
