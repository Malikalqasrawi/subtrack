import type { Subscription, SubscriptionStatus } from '@/api/types';

export type StatusFilter = 'ALL' | SubscriptionStatus;

export const SORTS = ['renewal', 'price', 'name'] as const;
export type Sort = (typeof SORTS)[number];

export const SORT_LABELS: Record<Sort, string> = {
  renewal: 'Next renewal',
  price: 'Highest price',
  name: 'Name',
};

export const nextSort = (sort: Sort): Sort => SORTS[(SORTS.indexOf(sort) + 1) % SORTS.length];

const COMPARE: Record<Sort, (a: Subscription, b: Subscription) => number> = {
  // Subscriptions with no upcoming renewal (paused, cancelled) go last.
  renewal: (a, b) => (a.nextRenewalDate ?? '9999').localeCompare(b.nextRenewalDate ?? '9999'),
  price: (a, b) => b.monthlyCost - a.monthlyCost,
  name: (a, b) => a.name.localeCompare(b.name),
};

/** The subscriptions to show: matching the search and the status, in the chosen order. */
export function visibleSubscriptions(subscriptions: Subscription[], query: string, status: StatusFilter, sort: Sort): Subscription[] {
  const wanted = query.trim().toLowerCase();
  return subscriptions
    .filter((subscription) => status === 'ALL' || subscription.status === status)
    .filter((subscription) => wanted === '' || subscription.name.toLowerCase().includes(wanted))
    .sort((a, b) => COMPARE[sort](a, b) || a.name.localeCompare(b.name));
}

/** What the active subscriptions cost per month, in the user's currency. */
export const monthlyTotal = (subscriptions: Subscription[]) =>
  subscriptions
    .filter((subscription) => subscription.status === 'ACTIVE')
    .reduce((sum, subscription) => sum + subscription.monthlyCost, 0);
