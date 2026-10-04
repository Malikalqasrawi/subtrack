import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { currencyApi, insightsApi, subscriptionApi } from '@/api/endpoints';
import type { Subscription, SubscriptionRequest } from '@/api/types';

const keys = {
  subscriptions: ['subscriptions'] as const,
  insights: ['insights'] as const,
  summary: ['insights', 'summary'] as const,
  calendar: (year: number, month: number) => ['insights', 'calendar', year, month] as const,
  currencies: ['currencies'] as const,
};

export const useSubscriptions = () => useQuery({ queryKey: keys.subscriptions, queryFn: subscriptionApi.list });

export const useSummary = () => useQuery({ queryKey: keys.summary, queryFn: insightsApi.summary });

/** @param month 1 to 12 */
export const useCalendar = (year: number, month: number) =>
  useQuery({ queryKey: keys.calendar(year, month), queryFn: () => insightsApi.calendar(year, month) });

export const useCurrencies = () => useQuery({ queryKey: keys.currencies, queryFn: currencyApi.list, staleTime: Infinity });

/**
 * The subscription as it was in the loaded list when the screen opened. It is read once, so
 * the edit screen keeps its copy while a save or delete changes the list underneath it.
 */
export function useLoadedSubscription(id: string): Subscription | undefined {
  const client = useQueryClient();
  const [subscription] = useState(() =>
    client.getQueryData<Subscription[]>(keys.subscriptions)?.find((candidate) => candidate.id === id),
  );
  return subscription;
}

/** Creates a subscription, or updates the one with the given id. */
export function useSaveSubscription() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id?: string; request: SubscriptionRequest }) =>
      id ? subscriptionApi.update(id, request) : subscriptionApi.create(request),
    onSuccess: (saved) => {
      client.setQueryData<Subscription[]>(keys.subscriptions, (current) =>
        current ? [...current.filter((subscription) => subscription.id !== saved.id), saved] : current,
      );
      client.invalidateQueries({ queryKey: keys.subscriptions });
      client.invalidateQueries({ queryKey: keys.insights });
    },
  });
}

export function useDeleteSubscription() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subscriptionApi.remove(id),
    onSuccess: (_result, id) => {
      client.setQueryData<Subscription[]>(keys.subscriptions, (current) =>
        current?.filter((subscription) => subscription.id !== id),
      );
      client.invalidateQueries({ queryKey: keys.subscriptions });
      client.invalidateQueries({ queryKey: keys.insights });
    },
  });
}
