import type { BillingCycle, Category, SubscriptionStatus } from '@/api/types';

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
}

/** Parses a yyyy-mm-dd string as a local date (new Date(string) would treat it as UTC). */
export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parseIsoDate(iso).getTime() - today.getTime()) / 86_400_000);
}

export function relativeDay(iso: string): string {
  const days = daysUntil(iso);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

export type Urgency = 'today' | 'soon' | 'later';

/** How close a renewal is: today, within the week, or further away. */
export function urgencyOf(iso: string): Urgency {
  const days = daysUntil(iso);
  if (days <= 0) return 'today';
  return days <= 7 ? 'soon' : 'later';
}

const titleCase = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();

export const categoryLabel = (category: Category) => titleCase(category);
export const statusLabel = (status: SubscriptionStatus) => titleCase(status);
export const cycleLabel = (cycle: BillingCycle) => titleCase(cycle);

const CYCLE_UNITS: Record<BillingCycle, string> = {
  WEEKLY: 'week',
  MONTHLY: 'month',
  QUARTERLY: 'quarter',
  YEARLY: 'year',
};
export const cycleUnit = (cycle: BillingCycle) => CYCLE_UNITS[cycle];
