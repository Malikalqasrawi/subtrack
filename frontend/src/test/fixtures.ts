import type { Subscription, User } from '../api/types'

export const demoUser: User = {
  id: 'user-1',
  email: 'demo@example.com',
  displayName: 'Demo User',
  phoneNumber: '+962790000000',
  defaultCurrency: 'USD',
  twoFactorEnabled: false,
  hasPassword: true,
}

export function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 'sub-1',
    name: 'Netflix',
    amount: 15.99,
    currency: 'USD',
    billingCycle: 'MONTHLY',
    category: 'ENTERTAINMENT',
    firstBillingDate: '2026-01-09',
    nextRenewalDate: '2026-10-09',
    status: 'ACTIVE',
    reminderDaysBefore: 3,
    notes: null,
    websiteUrl: null,
    monthlyCost: 15.99,
    displayCurrency: 'USD',
    ...overrides,
  }
}
