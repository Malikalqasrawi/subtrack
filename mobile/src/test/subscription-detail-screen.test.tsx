import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, screen, userEvent } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';

import { subscriptionApi } from '@/api/endpoints';
import type { Subscription } from '@/api/types';
import SubscriptionScreen from '@/app/subscription/[id]/index';
import { subscription } from '@/test/fixtures';
import { renderScreen } from '@/test/render-screen';

const mockRouter = { push: jest.fn(), back: jest.fn() };

jest.mock('@/api/endpoints');
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => ({ id: 'sub-1' }) }));

async function renderDetail(...subscriptions: Subscription[]) {
  jest.mocked(subscriptionApi.list).mockResolvedValue(subscriptions);
  // Without a garbage-collection timer, so nothing is left running when the test ends.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } } });
  client.setQueryData(['subscriptions'], subscriptions);
  await renderScreen(
    <QueryClientProvider client={client}>
      <SubscriptionScreen />
    </QueryClientProvider>,
  );
  return client;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 9, 4, 15, 30) });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('SubscriptionScreen', () => {
  it('shows what the subscription costs and when it renews', async () => {
    await renderDetail(
      subscription({ amount: 149, currency: 'EUR', billingCycle: 'YEARLY', monthlyCost: 13.8, nextRenewalDate: '2026-10-14', reminderDaysBefore: 7 }),
    );

    expect(screen.getByRole('header', { name: 'Netflix' })).toBeOnTheScreen();
    expect(screen.getByText('Entertainment')).toBeOnTheScreen();
    expect(screen.getByText('Active')).toBeOnTheScreen();
    expect(screen.getByText('Oct 14, 2026')).toBeOnTheScreen();
    expect(screen.getByText('10')).toBeOnTheScreen();
    expect(screen.getByText('Price per year')).toBeOnTheScreen();
    expect(screen.getByText('Monthly in USD')).toBeOnTheScreen();
    expect(screen.getByText('€149.00')).toBeOnTheScreen();
    expect(screen.getByText('$13.80')).toBeOnTheScreen();
    expect(screen.getByText('7 days before')).toBeOnTheScreen();
  });

  it('has no next billing for a paused subscription', async () => {
    await renderDetail(subscription({ status: 'PAUSED', nextRenewalDate: null, reminderDaysBefore: null }));

    expect(screen.getByText('Paused')).toBeOnTheScreen();
    expect(screen.getAllByText('None')).toHaveLength(2);
    expect(screen.getByText('No reminder')).toBeOnTheScreen();
  });

  it('opens the website and shows the notes when there are any', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await renderDetail(subscription({ websiteUrl: 'https://netflix.com/account', notes: 'Shared with family' }));

    expect(screen.getByText('Shared with family')).toBeOnTheScreen();
    await userEvent.press(screen.getByRole('link', { name: 'netflix.com/account' }));

    expect(openURL).toHaveBeenCalledWith('https://netflix.com/account');
  });

  it('opens the edit form', async () => {
    await renderDetail(subscription());

    await userEvent.press(screen.getByRole('button', { name: 'Edit' }));

    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/subscription/[id]/edit', params: { id: 'sub-1' } });
  });

  it('deletes only after the confirmation is accepted, then goes back', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(subscriptionApi.remove).mockResolvedValue(undefined);
    await renderDetail(subscription());

    await userEvent.press(screen.getByRole('button', { name: 'Delete subscription' }));

    expect(alert).toHaveBeenCalledWith('Delete Netflix?', expect.any(String), expect.any(Array));
    expect(subscriptionApi.remove).not.toHaveBeenCalled();

    const buttons = alert.mock.calls[0][2] ?? [];
    await act(async () => buttons.find((button) => button.style === 'destructive')?.onPress?.());

    expect(subscriptionApi.remove).toHaveBeenCalledWith('sub-1');
    expect(mockRouter.back).toHaveBeenCalled();
    // Still drawn while the screen closes, not swapped for an error.
    expect(screen.getByRole('header', { name: 'Netflix' })).toBeOnTheScreen();
  });

  it('says so when the subscription is not there', async () => {
    await renderDetail();

    expect(screen.getByText('This subscription no longer exists.')).toBeOnTheScreen();
  });
});
