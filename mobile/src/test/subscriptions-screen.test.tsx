import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, userEvent } from '@testing-library/react-native';

import { subscriptionApi } from '@/api/endpoints';
import SubscriptionsScreen from '@/app/(tabs)/subscriptions';
import { subscription } from '@/test/fixtures';
import { renderScreen } from '@/test/render-screen';

const mockRouter = { push: jest.fn() };

jest.mock('@/api/endpoints');
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

const SUBSCRIPTIONS = [
  subscription({ id: '1', name: 'Netflix', monthlyCost: 15.99, nextRenewalDate: '2026-10-14' }),
  subscription({ id: '2', name: 'Gym', amount: 35, monthlyCost: 35, category: 'HEALTH', nextRenewalDate: '2026-10-04' }),
  subscription({ id: '3', name: 'Spotify', amount: 6, monthlyCost: 6, status: 'PAUSED', nextRenewalDate: null }),
];

async function renderList() {
  // Without a garbage-collection timer, so nothing is left running when the test ends.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  await renderScreen(
    <QueryClientProvider client={client}>
      <SubscriptionsScreen />
    </QueryClientProvider>,
  );
  await screen.findByText('Netflix');
}

const shownNames = () => screen.getAllByRole('button', { name: /^Edit / }).map((card) => card.props.accessibilityLabel);

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 9, 4, 15, 30) });
  jest.mocked(subscriptionApi.list).mockResolvedValue(SUBSCRIPTIONS);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('SubscriptionsScreen', () => {
  it('sums up the list and shows the soonest renewal first', async () => {
    await renderList();

    expect(screen.getByText('3 in total · $50.99 a month')).toBeOnTheScreen();
    expect(shownNames()).toEqual(['Edit Gym', 'Edit Netflix', 'Edit Spotify']);
    expect(screen.getByText('Today')).toBeOnTheScreen();
    expect(screen.getByText('In 10 days')).toBeOnTheScreen();
  });

  it('searches by name and can be cleared', async () => {
    await renderList();

    await userEvent.type(screen.getByLabelText('Search subscriptions'), 'net');
    expect(shownNames()).toEqual(['Edit Netflix']);

    await userEvent.press(screen.getByRole('button', { name: 'Clear search' }));
    expect(shownNames()).toHaveLength(3);
  });

  it('filters by status', async () => {
    await renderList();

    await userEvent.press(screen.getByRole('radio', { name: 'Paused' }));

    expect(shownNames()).toEqual(['Edit Spotify']);
  });

  it('says so when nothing matches', async () => {
    await renderList();

    await userEvent.press(screen.getByRole('radio', { name: 'Cancelled' }));

    expect(screen.getByText('Nothing matches. Try another search or filter.')).toBeOnTheScreen();
  });

  it('changes the order each time the sort control is pressed', async () => {
    await renderList();

    await userEvent.press(screen.getByRole('button', { name: /^Sorted by next renewal/ }));

    expect(screen.getByText('Highest price')).toBeOnTheScreen();
    expect(shownNames()).toEqual(['Edit Gym', 'Edit Netflix', 'Edit Spotify']);

    await userEvent.press(screen.getByRole('button', { name: /^Sorted by highest price/ }));
    expect(screen.getByText('Name')).toBeOnTheScreen();
  });

  it('opens a subscription, and the form for a new one', async () => {
    await renderList();

    await userEvent.press(screen.getByRole('button', { name: 'Edit Netflix' }));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/subscription/[id]', params: { id: '1' } });

    await userEvent.press(screen.getByRole('button', { name: 'Add subscription' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/subscription/new');
  });
});
