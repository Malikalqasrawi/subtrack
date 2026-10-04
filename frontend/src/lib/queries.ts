import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { currencyApi, insightsApi, subscriptionApi } from '../api/endpoints'
import type { Subscription, SubscriptionRequest } from '../api/types'

const keys = {
  subscriptions: ['subscriptions'] as const,
  insights: ['insights'] as const,
  summary: ['insights', 'summary'] as const,
  calendar: (year: number, month: number) => ['insights', 'calendar', year, month] as const,
  currencies: ['currencies'] as const,
}

export const useSubscriptions = () => useQuery({ queryKey: keys.subscriptions, queryFn: subscriptionApi.list })

export const useSummary = () => useQuery({ queryKey: keys.summary, queryFn: insightsApi.summary })

export const useCalendar = (year: number, month: number) =>
  useQuery({ queryKey: keys.calendar(year, month), queryFn: () => insightsApi.calendar(year, month) })

export const useCurrencies = () =>
  useQuery({ queryKey: keys.currencies, queryFn: currencyApi.list, staleTime: Infinity })

/** Creates a subscription, or updates the one with the given id. */
export function useSaveSubscription() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, request }: { id?: string; request: SubscriptionRequest }) =>
      id ? subscriptionApi.update(id, request) : subscriptionApi.create(request),
    onSuccess: (saved) => {
      client.setQueryData<Subscription[]>(keys.subscriptions, (current) =>
        current ? [...current.filter((subscription) => subscription.id !== saved.id), saved] : current,
      )
      client.invalidateQueries({ queryKey: keys.subscriptions })
      client.invalidateQueries({ queryKey: keys.insights })
    },
  })
}

/** Removes the card straight away and puts it back if the server refuses. */
export function useDeleteSubscription() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => subscriptionApi.remove(id),
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: keys.subscriptions })
      const previous = client.getQueryData<Subscription[]>(keys.subscriptions)
      client.setQueryData<Subscription[]>(keys.subscriptions, (current) =>
        current?.filter((subscription) => subscription.id !== id),
      )
      return { previous }
    },
    onError: (_error, _id, context) => {
      client.setQueryData(keys.subscriptions, context?.previous)
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: keys.subscriptions })
      client.invalidateQueries({ queryKey: keys.insights })
    },
  })
}
