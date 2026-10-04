import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, userEvent } from '@testing-library/react-native';

import { insightsApi } from '@/api/endpoints';
import type { CalendarMonth, RenewalEntry } from '@/api/types';
import CalendarScreen from '@/app/(tabs)/calendar';
import { renderScreen } from '@/test/render-screen';

jest.mock('@/api/endpoints');

const renewal = (name: string, date: string, overrides: Partial<RenewalEntry> = {}): RenewalEntry => ({
  subscriptionId: name.toLowerCase(),
  name,
  category: 'ENTERTAINMENT',
  date,
  amount: 15.99,
  currency: 'USD',
  convertedAmount: 15.99,
  ...overrides,
});

const OCTOBER: CalendarMonth = {
  month: '2026-10',
  currency: 'USD',
  total: 27.6,
  renewals: [
    renewal('Netflix', '2026-10-14'),
    renewal('Spotify', '2026-10-20', { amount: 5.5, currency: 'EUR', convertedAmount: 6.11 }),
    renewal('iCloud+', '2026-10-14', { amount: 5.5, convertedAmount: 5.5 }),
  ],
};
const EMPTY_NOVEMBER: CalendarMonth = { month: '2026-11', currency: 'USD', total: 0, renewals: [] };

async function renderCalendar() {
  // Without a garbage-collection timer, so nothing is left running when the test ends.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  await renderScreen(
    <QueryClientProvider client={client}>
      <CalendarScreen />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 9, 4, 15, 30) });
  jest.mocked(insightsApi.calendar).mockImplementation(async (_year, month) => (month === 10 ? OCTOBER : EMPTY_NOVEMBER));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('CalendarScreen', () => {
  it('opens on the current month with its total and every charge', async () => {
    await renderCalendar();

    expect(await screen.findByText('3 charges this month, $27.60 in total.')).toBeOnTheScreen();
    expect(insightsApi.calendar).toHaveBeenCalledWith(2026, 10);
    expect(screen.getByText('October 2026')).toBeOnTheScreen();
    expect(screen.getByText('Netflix')).toBeOnTheScreen();
    expect(screen.getByText('Spotify')).toBeOnTheScreen();
    expect(screen.getByText('iCloud+')).toBeOnTheScreen();
  });

  it('says how many charges fall on each day', async () => {
    await renderCalendar();
    await screen.findByText('Netflix');

    expect(screen.getByRole('button', { name: 'Oct 14, 2026, 2 charges' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Oct 20, 2026, 1 charge' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Oct 15, 2026, 0 charges' })).toBeOnTheScreen();
  });

  it('shows a charge in another currency with its value in the user currency', async () => {
    await renderCalendar();

    expect(await screen.findByText('€5.50')).toBeOnTheScreen();
    expect(screen.getByText('≈ $6.11')).toBeOnTheScreen();
  });

  it('narrows the list to the tapped day and back to the whole month', async () => {
    await renderCalendar();
    await screen.findByText('Netflix');

    await userEvent.press(screen.getByRole('button', { name: 'Oct 14, 2026, 2 charges' }));
    expect(screen.getByText('Charges on Oct 14, 2026')).toBeOnTheScreen();
    expect(screen.getByText('Netflix')).toBeOnTheScreen();
    expect(screen.queryByText('Spotify')).not.toBeOnTheScreen();

    await userEvent.press(screen.getByRole('link', { name: 'Show whole month' }));
    expect(screen.getByText('Charges this month')).toBeOnTheScreen();
    expect(screen.getByText('Spotify')).toBeOnTheScreen();
  });

  it('says so when nothing is charged on the tapped day', async () => {
    await renderCalendar();
    await screen.findByText('Netflix');

    await userEvent.press(screen.getByRole('button', { name: 'Oct 15, 2026, 0 charges' }));

    expect(screen.getByText('Nothing is charged on this day.')).toBeOnTheScreen();
  });

  it('loads the next month, and Today comes back', async () => {
    await renderCalendar();
    await screen.findByText('Netflix');

    await userEvent.press(screen.getByRole('button', { name: 'Next month' }));
    expect(await screen.findByText('0 charges this month, $0.00 in total.')).toBeOnTheScreen();
    expect(insightsApi.calendar).toHaveBeenCalledWith(2026, 11);
    expect(screen.getByText('November 2026')).toBeOnTheScreen();
    expect(screen.getByText('Nothing is charged this month.')).toBeOnTheScreen();

    await userEvent.press(screen.getByRole('link', { name: 'Today' }));
    expect(screen.getByText('October 2026')).toBeOnTheScreen();
    expect(await screen.findByText('Netflix')).toBeOnTheScreen();
  });

  it('forgets the selected day when the month changes', async () => {
    await renderCalendar();
    await screen.findByText('Netflix');
    await userEvent.press(screen.getByRole('button', { name: 'Oct 14, 2026, 2 charges' }));

    await userEvent.press(screen.getByRole('button', { name: 'Previous month' }));

    expect(insightsApi.calendar).toHaveBeenCalledWith(2026, 9);
    expect(screen.queryByText('Charges on Oct 14, 2026')).not.toBeOnTheScreen();
  });

  it('shows the error when the month cannot be loaded', async () => {
    jest.mocked(insightsApi.calendar).mockRejectedValue(new Error('Could not reach the server. Check your connection and try again.'));
    await renderCalendar();

    expect(await screen.findByText('Could not reach the server. Check your connection and try again.')).toBeOnTheScreen();
    expect(screen.getByText('Could not load this month.')).toBeOnTheScreen();
  });
});
