import { api } from '@/api/client';
import type { AuthResponse, DashboardSummary, Session, Subscription, SubscriptionRequest } from '@/api/types';

const post = <T>(path: string, body?: unknown, auth = true) => api<T>(path, { method: 'POST', body, auth });

export const authApi = {
  login: (email: string, password: string) => post<AuthResponse>('/api/auth/login', { email, password }, false),
  twoFactor: (challengeToken: string, code: string) => post<Session>('/api/auth/2fa', { challengeToken, code }, false),
  logout: (refreshToken: string) => post<void>('/api/auth/logout', { refreshToken }, false),
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
};
