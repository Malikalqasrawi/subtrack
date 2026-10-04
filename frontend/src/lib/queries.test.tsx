import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { subscriptionApi } from '../api/endpoints'
import type { Subscription } from '../api/types'
import { subscription } from '../test/fixtures'
import { useDeleteSubscription, useSaveSubscription } from './queries'

vi.mock('../api/endpoints')

function setUp(cached: Subscription[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  client.setQueryData(['subscriptions'], cached)
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const names = () => client.getQueryData<Subscription[]>(['subscriptions'])?.map((item) => item.name)
  return { client, wrapper, names }
}

const netflix = subscription()
const spotify = subscription({ id: 'sub-2', name: 'Spotify' })

describe('useDeleteSubscription', () => {
  it('removes the subscription before the server answers', async () => {
    let finish = () => {}
    vi.mocked(subscriptionApi.remove).mockReturnValue(new Promise<void>((resolve) => (finish = resolve)))
    vi.mocked(subscriptionApi.list).mockResolvedValue([spotify])
    const { wrapper, names } = setUp([netflix, spotify])
    const { result } = renderHook(() => useDeleteSubscription(), { wrapper })

    act(() => result.current.mutate('sub-1'))

    await waitFor(() => expect(names()).toEqual(['Spotify']))
    expect(result.current.isPending).toBe(true)
    await act(async () => finish())
  })

  it('puts it back when the server refuses', async () => {
    vi.mocked(subscriptionApi.remove).mockRejectedValue(new Error('Server is down'))
    vi.mocked(subscriptionApi.list).mockResolvedValue([netflix, spotify])
    const { wrapper, names } = setUp([netflix, spotify])
    const { result } = renderHook(() => useDeleteSubscription(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync('sub-1').catch(() => {})
    })

    expect(names()).toEqual(['Netflix', 'Spotify'])
  })
})

describe('useSaveSubscription', () => {
  it('creates without an id and updates with one, then marks the totals as out of date', async () => {
    const saved = subscription({ id: 'sub-3', name: 'iCloud+' })
    vi.mocked(subscriptionApi.create).mockResolvedValue(saved)
    vi.mocked(subscriptionApi.update).mockResolvedValue({ ...netflix, amount: 17.99 })
    vi.mocked(subscriptionApi.list).mockResolvedValue([netflix, saved])
    const { client, wrapper, names } = setUp([netflix])
    client.setQueryData(['insights', 'summary'], { activeCount: 1 })
    const { result } = renderHook(() => useSaveSubscription(), { wrapper })
    const request = { ...saved, websiteUrl: '', notes: '' }

    await act(async () => {
      await result.current.mutateAsync({ request })
    })
    expect(subscriptionApi.create).toHaveBeenCalledWith(request)
    expect(names()).toEqual(['Netflix', 'iCloud+'])
    expect(client.getQueryState(['insights', 'summary'])?.isInvalidated).toBe(true)

    await act(async () => {
      await result.current.mutateAsync({ id: 'sub-1', request })
    })
    expect(subscriptionApi.update).toHaveBeenCalledWith('sub-1', request)
  })
})
