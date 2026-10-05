import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Subscription } from '@/api/types';
import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ServiceIcon } from '@/components/service-icon';
import { TextLink } from '@/components/text-link';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/errors';
import { categoryLabel, cycleLabel, cycleUnit, daysUntil, formatDate, formatMoney, statusLabel } from '@/lib/format';
import { useDeleteSubscription, useSubscription } from '@/lib/queries';
import { REMINDER_OPTIONS } from '@/lib/subscription-form';

export default function SubscriptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const subscription = useSubscription(id);
  const theme = useTheme();
  const router = useRouter();
  const remove = useDeleteSubscription();
  const [error, setError] = useState<string>();

  if (!subscription) {
    return (
      <SafeAreaView style={[styles.missing, { backgroundColor: theme.background }]}>
        <Text style={[styles.message, { color: theme.textSecondary }]}>This subscription no longer exists.</Text>
        <Button label="Go back" variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  async function deleteSubscription() {
    setError(undefined);
    try {
      await remove.mutateAsync(id);
      router.back();
    } catch (err) {
      setError(errorMessage(err, 'Could not delete the subscription'));
    }
  }

  function confirmDelete(name: string) {
    Alert.alert(`Delete ${name}?`, 'It will be removed from your totals, calendar and reminders. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: deleteSubscription },
    ]);
  }

  const active = subscription.status === 'ACTIVE';
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <TextLink label="Edit" onPress={() => router.push({ pathname: '/subscription/[id]/edit', params: { id } })} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <ServiceIcon name={subscription.name} category={subscription.category} size={76} />
          <Text accessibilityRole="header" style={[styles.name, { color: theme.text }]}>
            {subscription.name}
          </Text>
          <View style={styles.pills}>
            <Pill label={categoryLabel(subscription.category)} />
            <Pill label={statusLabel(subscription.status)} highlighted={active} />
          </View>
        </View>

        <View style={styles.tiles}>
          <Tile icon="calendar" label="Next billing" value={subscription.nextRenewalDate ? formatDate(subscription.nextRenewalDate) : 'None'} />
          <Tile icon="clock" label="Days left" value={subscription.nextRenewalDate ? daysLeft(subscription.nextRenewalDate) : 'None'} />
        </View>
        <View style={styles.tiles}>
          <Tile
            icon="credit-card"
            label={`Price per ${cycleUnit(subscription.billingCycle)}`}
            value={formatMoney(subscription.amount, subscription.currency)}
          />
          <Tile icon="trending-up" label={`Monthly in ${subscription.displayCurrency}`} value={formatMoney(subscription.monthlyCost, subscription.displayCurrency)} />
        </View>

        <Card>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Details</Text>
          <Detail label="Billed" value={cycleLabel(subscription.billingCycle)} />
          <Detail label="First billing date" value={formatDate(subscription.firstBillingDate)} />
          <Detail label="Email reminder" value={reminderLabel(subscription)} />
          {subscription.websiteUrl && <Website url={subscription.websiteUrl} />}
          {subscription.notes && <Detail label="Notes" value={subscription.notes} />}
        </Card>

        {error && <Banner message={error} />}
        <Button label="Edit" onPress={() => router.push({ pathname: '/subscription/[id]/edit', params: { id } })} />
        <Button label="Delete subscription" variant="danger" onPress={() => confirmDelete(subscription.name)} busy={remove.isPending} />
      </ScrollView>
    </SafeAreaView>
  );
}

function daysLeft(date: string): string {
  const days = daysUntil(date);
  return days <= 0 ? 'Today' : String(days);
}

const reminderLabel = (subscription: Subscription) =>
  REMINDER_OPTIONS.find((option) => option.value === subscription.reminderDaysBefore)?.label ??
  `${subscription.reminderDaysBefore} days before`;

function Pill({ label, highlighted }: { label: string; highlighted?: boolean }) {
  const theme = useTheme();
  return (
    <Text
      style={[
        styles.pill,
        highlighted
          ? { color: theme.accent, backgroundColor: theme.accentSoft }
          : { color: theme.textSecondary, backgroundColor: theme.surfaceAlt },
      ]}>
      {label}
    </Text>
  );
}

function Tile({ icon, label, value }: { icon: 'calendar' | 'clock' | 'credit-card' | 'trending-up'; label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.tileLabel}>
        <Feather name={icon} size={14} color={theme.accent} />
        <Text style={[styles.note, { color: theme.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[styles.tileValue, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.detail}>
      <Text style={[styles.note, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

function Website({ url }: { url: string }) {
  const theme = useTheme();
  return (
    <View style={styles.detail}>
      <Text style={[styles.note, { color: theme.textSecondary }]}>Website</Text>
      <TextLink label={url.replace(/^https?:\/\//, '')} onPress={() => Linking.openURL(url).catch(() => {})} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
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
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  top: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  name: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  pills: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  pill: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    overflow: 'hidden',
  },
  tiles: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  tile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  tileLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  tileValue: {
    fontFamily: Fonts.mono,
    fontSize: 18,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  detail: {
    gap: Spacing.half,
    paddingVertical: Spacing.one,
  },
  detailValue: {
    fontSize: 15,
  },
  note: {
    fontSize: 13,
  },
});
