import { api } from '@/api/client';
import type {
  AuthResponse,
  CalendarMonth,
  DashboardSummary,
  OwnerProof,
  Session,
  Subscription,
  SubscriptionRequest,
  TwoFactorSetup,
  User,
} from '@/api/types';

const post = <T>(path: string, body?: unknown, auth = true) => api<T>(path, { method: 'POST', body, auth });

export const authApi = {
  login: (email: string, password: string) => post<AuthResponse>('/api/auth/login', { email, password }, false),
  register: (email: string, password: string, displayName: string, phoneNumber: string) =>
    post<void>('/api/auth/register', { email, password, displayName, phoneNumber }, false),
  verify: (email: string, password: string, code: string) =>
    post<Session>('/api/auth/verify', { email, password, code }, false),
  resendVerification: (email: string) => post<void>('/api/auth/resend-verification', { email }, false),
  forgotPassword: (email: string) => post<void>('/api/auth/forgot-password', { email }, false),
  resetPassword: (email: string, code: string, newPassword: string) =>
    post<void>('/api/auth/reset-password', { email, code, newPassword }, false),
  google: (idToken: string) => post<AuthResponse>('/api/auth/google', { idToken }, false),
  twoFactor: (challengeToken: string, code: string) => post<Session>('/api/auth/2fa', { challengeToken, code }, false),
  logout: (refreshToken: string) => post<void>('/api/auth/logout', { refreshToken }, false),
};

export const userApi = {
  update: (displayName: string, phoneNumber: string, defaultCurrency: string) =>
    api<User>('/api/users/me', { method: 'PUT', body: { displayName, phoneNumber, defaultCurrency } }),
  sendConfirmationCode: () => post<void>('/api/users/me/confirmation-code'),
  changePassword: (proof: OwnerProof, newPassword: string) =>
    post<Session>('/api/users/me/password', { ...proof, newPassword }),
  requestEmailChange: (newEmail: string, proof: OwnerProof) => post<void>('/api/users/me/email', { newEmail, ...proof }),
  confirmEmailChange: (code: string) => post<User>('/api/users/me/email/confirm', { code }),
  logoutEverywhere: () => post<void>('/api/users/me/logout-all'),
  deleteAccount: (proof: OwnerProof) => api<void>('/api/users/me', { method: 'DELETE', body: proof }),
};

export const twoFactorApi = {
  setup: (proof: OwnerProof) => post<TwoFactorSetup>('/api/users/me/2fa/setup', proof),
  enable: (code: string) => post<{ recoveryCodes: string[] }>('/api/users/me/2fa/enable', { code }),
  disable: (code: string) => post<void>('/api/users/me/2fa/disable', { code }),
};

export const subscriptionApi = {
  list: () => api<Subscription[]>('/api/subscriptions'),
  create: (request: SubscriptionRequest) => post<Subscription>('/api/subscriptions', request),
  update: (id: string, request: SubscriptionRequest) =>
    api<Subscription>(`/api/subscriptions/${id}`, { method: 'PUT', body: request }),
  remove: (id: string) => api<void>(`/api/subscriptions/${id}`, { method: 'DELETE' }),
};

export const currencyApi = {
  list: () => api<string[]>('/api/currencies'),
};

export const insightsApi = {
  summary: () => api<DashboardSummary>('/api/insights/summary'),
  calendar: (year: number, month: number) => api<CalendarMonth>(`/api/insights/calendar?year=${year}&month=${month}`),
};
