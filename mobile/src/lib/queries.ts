import { useQuery } from '@tanstack/react-query';

import { insightsApi, subscriptionApi } from '@/api/endpoints';

const keys = {
  subscriptions: ['subscriptions'] as const,
  summary: ['insights', 'summary'] as const,
};

export const useSubscriptions = () => useQuery({ queryKey: keys.subscriptions, queryFn: subscriptionApi.list });

export const useSummary = () => useQuery({ queryKey: keys.summary, queryFn: insightsApi.summary });
