import type { Subscription, User } from '@/api/types';

export function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 'sub-1',
    name: 'Netflix',
    amount: 15.99,
    currency: 'USD',
    billingCycle: 'MONTHLY',
    category: 'ENTERTAINMENT',
    firstBillingDate: '2026-01-15',
    nextRenewalDate: '2026-10-15',
    status: 'ACTIVE',
    reminderDaysBefore: 3,
    notes: null,
    websiteUrl: null,
    monthlyCost: 15.99,
    displayCurrency: 'USD',
    ...overrides,
  };
}

export function user(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'demo@subtrack.example',
    displayName: 'Demo User',
    phoneNumber: null,
    defaultCurrency: 'USD',
    twoFactorEnabled: false,
    hasPassword: true,
    ...overrides,
  };
}
