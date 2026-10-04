// These mirror the backend DTOs. Keep them in sync with the Java records.

export const BILLING_CYCLES = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const CATEGORIES = [
  'ENTERTAINMENT',
  'MUSIC',
  'GAMING',
  'PRODUCTIVITY',
  'CLOUD',
  'EDUCATION',
  'HEALTH',
  'NEWS',
  'UTILITIES',
  'FINANCE',
  'SHOPPING',
  'OTHER',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const STATUSES = ['ACTIVE', 'PAUSED', 'CANCELLED'] as const;
export type SubscriptionStatus = (typeof STATUSES)[number];

export interface User {
  id: string;
  email: string;
  displayName: string;
  phoneNumber: string | null;
  defaultCurrency: string;
  twoFactorEnabled: boolean;
  /** False for accounts created with Google or Apple that have not set a password. */
  hasPassword: boolean;
}

/** A signed-in session. The app keeps the refresh token; the web version gets it as a cookie. */
export interface Session {
  accessToken: string;
  expiresInSeconds: number;
  user: User;
  refreshToken: string;
}

/**
 * What a sign-in attempt returns: a session, or (when `twoFactorRequired` is true) a challenge
 * token to send back with the second-factor code.
 */
export type AuthResponse =
  | (Session & { twoFactorRequired: false })
  | { twoFactorRequired: true; challengeToken: string };

export interface TwoFactorSetup {
  /** The key to type into an authenticator app by hand. */
  secret: string;
  /** The same key as a link, for a QR code or to hand to an authenticator app. */
  otpauthUri: string;
}

export interface SubscriptionRequest {
  name: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  category: Category;
  /** ISO date, yyyy-mm-dd */
  firstBillingDate: string;
  status: SubscriptionStatus;
  reminderDaysBefore: number | null;
  notes: string;
  websiteUrl: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  category: Category;
  firstBillingDate: string;
  nextRenewalDate: string | null;
  status: SubscriptionStatus;
  reminderDaysBefore: number | null;
  notes: string | null;
  websiteUrl: string | null;
  /** Cost per month in `displayCurrency`, the user's default currency. */
  monthlyCost: number;
  displayCurrency: string;
}

export interface RenewalEntry {
  subscriptionId: string;
  name: string;
  category: Category;
  date: string;
  amount: number;
  currency: string;
  convertedAmount: number;
}

export interface CategorySpend {
  category: Category;
  monthlyAmount: number;
  count: number;
}

export interface MonthlyProjection {
  /** yyyy-mm */
  month: string;
  amount: number;
}

export interface DashboardSummary {
  currency: string;
  monthlyTotal: number;
  yearlyTotal: number;
  activeCount: number;
  byCategory: CategorySpend[];
  upcoming: RenewalEntry[];
  projection: MonthlyProjection[];
  ratesAsOf: string;
}

export interface CalendarMonth {
  month: string;
  currency: string;
  total: number;
  renewals: RenewalEntry[];
}
