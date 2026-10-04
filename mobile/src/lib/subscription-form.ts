import type { BillingCycle, Category, Subscription, SubscriptionRequest, SubscriptionStatus } from '@/api/types';
import { toIsoDate } from '@/lib/format';

export interface SubscriptionFormValues {
  name: string;
  /** Kept as typed, so "9." or an empty box can be shown while the user is still writing. */
  amount: string;
  currency: string;
  billingCycle: BillingCycle;
  category: Category;
  firstBillingDate: string;
  status: SubscriptionStatus;
  reminderDaysBefore: number | null;
  websiteUrl: string;
  notes: string;
}

export type FieldErrors = Partial<Record<keyof SubscriptionFormValues, string>>;

export const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'No reminder' },
  { value: 0, label: 'On the day' },
  { value: 1, label: '1 day before' },
  { value: 3, label: '3 days before' },
  { value: 7, label: '7 days before' },
  { value: 14, label: '14 days before' },
];

/** Common services, to fill in the name and category with one tap. */
export const PRESETS: { name: string; category: Category }[] = [
  { name: 'Netflix', category: 'ENTERTAINMENT' },
  { name: 'Spotify', category: 'MUSIC' },
  { name: 'YouTube Premium', category: 'ENTERTAINMENT' },
  { name: 'iCloud+', category: 'CLOUD' },
  { name: 'ChatGPT Plus', category: 'PRODUCTIVITY' },
  { name: 'Xbox Game Pass', category: 'GAMING' },
  { name: 'Amazon Prime', category: 'SHOPPING' },
  { name: 'Gym', category: 'HEALTH' },
];

const DEFAULT_REMINDER_DAYS = 3;

export function initialValues(subscription: Subscription | undefined, defaultCurrency: string): SubscriptionFormValues {
  return {
    name: subscription?.name ?? '',
    amount: subscription ? String(subscription.amount) : '',
    currency: subscription?.currency ?? defaultCurrency,
    billingCycle: subscription?.billingCycle ?? 'MONTHLY',
    category: subscription?.category ?? 'ENTERTAINMENT',
    firstBillingDate: subscription?.firstBillingDate ?? toIsoDate(new Date()),
    status: subscription?.status ?? 'ACTIVE',
    reminderDaysBefore: subscription ? subscription.reminderDaysBefore : DEFAULT_REMINDER_DAYS,
    websiteUrl: subscription?.websiteUrl ?? '',
    notes: subscription?.notes ?? '',
  };
}

// Some keyboards type a comma as the decimal separator.
const normaliseAmount = (amount: string) => amount.trim().replace(',', '.');

/** The same rules the API enforces, checked first so most mistakes never need a round trip. */
export function validate(values: SubscriptionFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (values.name.trim() === '') errors.name = 'Enter a name';
  const amount = normaliseAmount(values.amount);
  if (amount === '') errors.amount = 'Enter a price';
  else if (!/^\d{1,10}(\.\d{1,2})?$/.test(amount)) errors.amount = 'Use a number like 9.99';
  if (values.websiteUrl.trim() !== '' && !/^https?:\/\/.+/.test(values.websiteUrl.trim())) {
    errors.websiteUrl = 'Must start with http:// or https://';
  }
  return errors;
}

export function toRequest(values: SubscriptionFormValues): SubscriptionRequest {
  return {
    name: values.name.trim(),
    amount: Number(normaliseAmount(values.amount)),
    currency: values.currency,
    billingCycle: values.billingCycle,
    category: values.category,
    firstBillingDate: values.firstBillingDate,
    status: values.status,
    reminderDaysBefore: values.reminderDaysBefore,
    websiteUrl: values.websiteUrl.trim(),
    notes: values.notes.trim(),
  };
}
