import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen } from '@testing-library/react-native';

import { insightsApi } from '@/api/endpoints';
import type { DashboardSummary } from '@/api/types';
import DashboardScreen from '@/app/(tabs)/index';
import { renderScreen } from '@/test/render-screen';

jest.mock('@/api/endpoints');
jest.mock('@/session/session-context', () => ({
  useCurrentUser: () => jest.requireActual<typeof import('@/test/fixtures')>('@/test/fixtures').user(),
}));

const SUMMARY: DashboardSummary = {
  currency: 'USD',
  monthlyTotal: 50,
  yearlyTotal: 600,
  activeCount: 2,
  byCategory: [
    { category: 'HEALTH', monthlyAmount: 35, count: 1 },
    { category: 'ENTERTAINMENT', monthlyAmount: 15, count: 1 },
  ],
  upcoming: [
    { subscriptionId: '2', name: 'Gym', category: 'HEALTH', date: '2026-10-04', amount: 25, currency: 'JOD', convertedAmount: 35 },
    { subscriptionId: '1', name: 'Netflix', category: 'ENTERTAINMENT', date: '2026-10-14', amount: 15, currency: 'USD', convertedAmount: 15 },
  ],
  projection: [
    { month: '2026-10', amount: 50 },
    { month: '2026-11', amount: 199 },
    { month: '2026-12', amount: 50 },
  ],
  ratesAsOf: '2026-10-04T00:00:00Z',
};

async function renderDashboard(summary: DashboardSummary) {
  jest.mocked(insightsApi.summary).mockResolvedValue(summary);
  // Without a garbage-collection timer, so nothing is left running when the test ends.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  await renderScreen(
    <QueryClientProvider client={client}>
      <DashboardScreen />
    </QueryClientProvider>,
  );
  await screen.findByText('MONTHLY SPEND');
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 9, 4, 9, 0) });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('DashboardScreen', () => {
  it('greets the user and shows the totals', async () => {
    await renderDashboard(SUMMARY);

    expect(screen.getByText('Good morning, Demo')).toBeOnTheScreen();
    expect(screen.getByText('$50.00')).toBeOnTheScreen();
    expect(screen.getByText('$600.00')).toBeOnTheScreen();
  });

  it('tags each upcoming renewal by how soon it is, with foreign amounts converted', async () => {
    await renderDashboard(SUMMARY);

    expect(screen.getByText('Today')).toBeOnTheScreen();
    expect(screen.getByText('In 10 days')).toBeOnTheScreen();
    expect(screen.getByText('≈ $35.00')).toBeOnTheScreen();
  });

  it('breaks the spend down by category with each share', async () => {
    await renderDashboard(SUMMARY);

    expect(screen.getByLabelText('Spend across 2 categories')).toBeOnTheScreen();
    expect(screen.getByText('Health')).toBeOnTheScreen();
    expect(screen.getByText('70%')).toBeOnTheScreen();
    expect(screen.getByText('30%')).toBeOnTheScreen();
  });

  it('charts the coming months and points out the busiest one', async () => {
    await renderDashboard(SUMMARY);

    expect(screen.getByLabelText('Charges for the next 3 months')).toBeOnTheScreen();
    expect(screen.getByText('Busiest: Nov')).toBeOnTheScreen();
    expect(screen.getByText('$199.00')).toBeOnTheScreen();
    expect(screen.getByText('$299.00')).toBeOnTheScreen();
  });

  it('has friendly words for an account with nothing in it yet', async () => {
    await renderDashboard({ ...SUMMARY, monthlyTotal: 0, yearlyTotal: 0, activeCount: 0, byCategory: [], upcoming: [], projection: [] });

    expect(screen.getByText('Nothing renews in the next 30 days.')).toBeOnTheScreen();
    expect(screen.getByText('Add a subscription to see where your money goes.')).toBeOnTheScreen();
  });
});
