import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { currencyApi, subscriptionApi } from '@/api/endpoints';
import type { Subscription } from '@/api/types';
import { SubscriptionForm } from '@/components/subscription-form';
import { subscription } from '@/test/fixtures';

const mockBack = jest.fn();

jest.mock('@/api/endpoints');
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));
jest.mock('@/session/session-context', () => ({
  useCurrentUser: () => jest.requireActual<typeof import('@/test/fixtures')>('@/test/fixtures').user(),
}));

const SCREEN = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderForm(existing?: Subscription) {
  // Without a garbage-collection timer, so nothing is left running when the test ends.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  await render(
    <SafeAreaProvider initialMetrics={SCREEN}>
      <QueryClientProvider client={client}>
        <SubscriptionForm subscription={existing} />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(currencyApi.list).mockResolvedValue(['USD', 'JOD']);
  jest.mocked(subscriptionApi.list).mockResolvedValue([]);
});

describe('SubscriptionForm', () => {
  it('fills in the name and category from a popular service', async () => {
    await renderForm();
    await userEvent.press(screen.getByRole('radio', { name: 'Spotify' }));

    expect(screen.getByLabelText('Name')).toHaveDisplayValue('Spotify');
    expect(screen.getByLabelText('Category: Music')).toBeOnTheScreen();
  });

  it('creates a subscription with the price as a number, then closes', async () => {
    jest.mocked(subscriptionApi.create).mockResolvedValue(subscription({ name: 'Spotify' }));
    await renderForm();

    await userEvent.type(screen.getByLabelText('Name'), 'Spotify');
    await userEvent.type(screen.getByLabelText('Price'), '5.99');
    await userEvent.press(screen.getByRole('radio', { name: 'Yearly' }));
    await userEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(subscriptionApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Spotify', amount: 5.99, currency: 'USD', billingCycle: 'YEARLY', status: 'ACTIVE', reminderDaysBefore: 3 }),
    );
    expect(mockBack).toHaveBeenCalled();
  });

  it('does not call the API while the form has mistakes', async () => {
    await renderForm();
    await userEvent.type(screen.getByLabelText('Price'), '4.999');
    await userEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Enter a name')).toBeOnTheScreen();
    expect(screen.getByText('Use a number like 9.99')).toBeOnTheScreen();
    expect(subscriptionApi.create).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('starts from the existing values and updates instead of creating', async () => {
    const existing = subscription({ id: 'sub-9', name: 'JetBrains', amount: 149, billingCycle: 'YEARLY' });
    jest.mocked(subscriptionApi.update).mockResolvedValue(existing);
    await renderForm(existing);

    expect(screen.getByLabelText('Name')).toHaveDisplayValue('JetBrains');
    expect(screen.getByRole('radio', { name: 'Yearly' })).toBeSelected();
    expect(screen.queryByRole('radio', { name: 'Spotify' })).not.toBeOnTheScreen();

    await userEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(subscriptionApi.update).toHaveBeenCalledWith('sub-9', expect.objectContaining({ name: 'JetBrains', amount: 149 }));
    expect(subscriptionApi.create).not.toHaveBeenCalled();
  });

  it('shows the errors the API sends back and stays open', async () => {
    jest.mocked(subscriptionApi.create).mockRejectedValue(
      new ApiError(400, 'VALIDATION', 'Check the form', { name: 'must not contain line breaks' }),
    );
    await renderForm();

    await userEvent.type(screen.getByLabelText('Name'), 'Spotify');
    await userEvent.type(screen.getByLabelText('Price'), '5.99');
    await userEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('must not contain line breaks')).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('deletes only after the confirmation is accepted', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(subscriptionApi.remove).mockResolvedValue(undefined);
    await renderForm(subscription({ id: 'sub-9', name: 'JetBrains' }));

    await userEvent.press(screen.getByRole('button', { name: 'Delete subscription' }));

    expect(alert).toHaveBeenCalledWith('Delete JetBrains?', expect.any(String), expect.any(Array));
    expect(subscriptionApi.remove).not.toHaveBeenCalled();

    const buttons = alert.mock.calls[0][2] ?? [];
    await act(async () => buttons.find((button) => button.style === 'destructive')?.onPress?.());

    expect(subscriptionApi.remove).toHaveBeenCalledWith('sub-9');
    expect(mockBack).toHaveBeenCalled();
  });
});
