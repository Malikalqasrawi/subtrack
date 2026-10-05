import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Alert } from 'react-native';

import { ApiError } from '@/api/client';
import { currencyApi, userApi } from '@/api/endpoints';
import type { Session } from '@/api/types';
import SettingsScreen from '@/app/(tabs)/settings';
import SettingsSectionScreen from '@/app/settings/[section]';
import { AppearanceProvider } from '@/appearance/appearance-context';
import { AppearanceSection } from '@/components/settings/appearance-section';
import { PasswordSection } from '@/components/settings/password-section';
import { ProfileSection } from '@/components/settings/profile-section';
import { SessionsSection } from '@/components/settings/sessions-section';
import { user } from '@/test/fixtures';
import { renderScreen } from '@/test/render-screen';

const mockUser = jest.fn();
const mockRouter = { push: jest.fn(), back: jest.fn() };
const mockParams = jest.fn();
const mockSession = { updateUser: jest.fn(), replaceSession: jest.fn(), signOut: jest.fn(), clearSession: jest.fn() };

jest.mock('@/api/endpoints');
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams(),
  Redirect: () => null,
}));
jest.mock('@/session/session-context', () => ({ useCurrentUser: () => mockUser(), useSession: () => mockSession }));

const NEW_PASSWORD = 'Subtrack#2027';
const CURRENCIES = ['EUR', 'JOD', 'USD'];

/** Each section is tested on its own: several of them have a field with the same label. */
async function renderSettings(section: ReactElement) {
  // Without a garbage-collection timer, so nothing is left running when the test ends.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  jest.spyOn(client, 'invalidateQueries');
  // The currency list is already loaded, so nothing is still arriving while a test runs.
  client.setQueryData(['currencies'], CURRENCIES);
  await renderScreen(<QueryClientProvider client={client}>{section}</QueryClientProvider>);
  return client;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUser.mockReturnValue(user({ phoneNumber: '+962791234567' }));
  // Saving the profile reloads everything, the currency list included.
  jest.mocked(currencyApi.list).mockResolvedValue(CURRENCIES);
});

describe('the settings menu', () => {
  it('lists every part of the account with its current state', async () => {
    mockUser.mockReturnValue(user({ twoFactorEnabled: true }));
    await renderSettings(<SettingsScreen />);

    for (const label of ['Profile', 'Appearance', 'Email address', 'Password', 'Sign out', 'Delete account']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${label},`) })).toBeOnTheScreen();
    }
    expect(screen.getByRole('button', { name: 'Two-factor authentication, On' })).toBeOnTheScreen();
  });

  it('opens a section on its own screen', async () => {
    await renderSettings(<SettingsScreen />);

    await userEvent.press(screen.getByRole('button', { name: /^Password,/ }));

    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/settings/[section]', params: { section: 'password' } });
  });
});

describe('a settings screen', () => {
  it('shows the one section it was opened for and goes back', async () => {
    mockParams.mockReturnValue({ section: 'password' });
    await renderSettings(<SettingsSectionScreen />);

    expect(screen.getByRole('header', { name: 'Change password' })).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Profile' })).not.toBeOnTheScreen();

    await userEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('shows nothing for an address that is not a section', async () => {
    mockParams.mockReturnValue({ section: 'nothing-here' });
    await renderSettings(<SettingsSectionScreen />);

    expect(screen.queryByRole('header')).not.toBeOnTheScreen();
  });
});

describe('profile', () => {
  it('starts from the account as it is', async () => {
    await renderSettings(<ProfileSection />);

    expect(screen.getByLabelText('Name')).toHaveDisplayValue('Demo User');
    expect(screen.getByLabelText('Phone number')).toHaveDisplayValue('+962791234567');
    expect(screen.getByLabelText('Default currency: USD')).toBeOnTheScreen();
  });

  it('saves the new name, a cleaned-up phone number and the chosen currency', async () => {
    const saved = user({ displayName: 'Malik Demo', phoneNumber: '+962790000000', defaultCurrency: 'JOD' });
    jest.mocked(userApi.update).mockResolvedValue(saved);
    const client = await renderSettings(<ProfileSection />);

    await userEvent.clear(screen.getByLabelText('Name'));
    await userEvent.type(screen.getByLabelText('Name'), ' Malik Demo ');
    await userEvent.clear(screen.getByLabelText('Phone number'));
    await userEvent.type(screen.getByLabelText('Phone number'), '+962 79 000-0000');
    await userEvent.press(screen.getByLabelText('Default currency: USD'));
    await userEvent.press(await screen.findByRole('radio', { name: 'JOD' }));
    await userEvent.press(screen.getByRole('button', { name: 'Save profile' }));

    expect(userApi.update).toHaveBeenCalledWith('Malik Demo', '+962790000000', 'JOD');
    expect(mockSession.updateUser).toHaveBeenCalledWith(saved);
    expect(client.invalidateQueries).toHaveBeenCalled();
    expect(screen.getByText('Profile saved')).toBeOnTheScreen();
  });

  it('stops a phone number without a country code before calling the API', async () => {
    await renderSettings(<ProfileSection />);

    await userEvent.clear(screen.getByLabelText('Phone number'));
    await userEvent.type(screen.getByLabelText('Phone number'), '0791234567');
    await userEvent.press(screen.getByRole('button', { name: 'Save profile' }));

    expect(screen.getByText('Use international format, for example +962791234567')).toBeOnTheScreen();
    expect(userApi.update).not.toHaveBeenCalled();
  });

  it('shows the errors the API sends back and keeps the old profile', async () => {
    jest.mocked(userApi.update).mockRejectedValue(
      new ApiError(400, 'VALIDATION', 'Check the form', { displayName: 'can only contain letters, spaces, apostrophes and hyphens' }),
    );
    await renderSettings(<ProfileSection />);

    await userEvent.press(screen.getByRole('button', { name: 'Save profile' }));

    expect(await screen.findByText('can only contain letters, spaces, apostrophes and hyphens')).toBeOnTheScreen();
    expect(mockSession.updateUser).not.toHaveBeenCalled();
    expect(screen.queryByText('Profile saved')).not.toBeOnTheScreen();
  });
});

describe('appearance', () => {
  it('starts on Match system, switches at once and remembers the choice on the phone', async () => {
    await renderSettings(
      <AppearanceProvider>
        <AppearanceSection />
      </AppearanceProvider>,
    );
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Match system' })).toBeSelected());

    await userEvent.press(screen.getByRole('radio', { name: 'Dark' }));

    expect(screen.getByRole('radio', { name: 'Dark' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Match system' })).not.toBeSelected();
    expect(await AsyncStorage.getItem('subtrack.appearance')).toBe('dark');
  });
});

describe('password', () => {
  const session: Session = { accessToken: 'access-2', expiresInSeconds: 900, user: user(), refreshToken: 'refresh-2' };

  it('changes the password and keeps the session the server hands back', async () => {
    jest.mocked(userApi.changePassword).mockResolvedValue(session);
    await renderSettings(<PasswordSection />);

    await userEvent.type(screen.getByLabelText('Current password'), 'Subtrack#2026');
    await userEvent.type(screen.getByLabelText('New password'), NEW_PASSWORD);
    await userEvent.type(screen.getByLabelText('Confirm new password'), NEW_PASSWORD);
    await userEvent.press(screen.getByRole('button', { name: 'Change password' }));

    expect(userApi.changePassword).toHaveBeenCalledWith({ currentPassword: 'Subtrack#2026' }, NEW_PASSWORD);
    expect(mockSession.replaceSession).toHaveBeenCalledWith(session);
    expect(await screen.findByText('Password changed')).toBeOnTheScreen();
    expect(screen.getByLabelText('Current password')).toHaveDisplayValue('');
    expect(screen.getByLabelText('New password')).toHaveDisplayValue('');
  });

  it('says when the current password is wrong and keeps the session', async () => {
    jest.mocked(userApi.changePassword).mockRejectedValue(new ApiError(403, 'WRONG_PASSWORD', 'Your current password is incorrect'));
    await renderSettings(<PasswordSection />);

    await userEvent.type(screen.getByLabelText('Current password'), 'not-my-password');
    await userEvent.type(screen.getByLabelText('New password'), NEW_PASSWORD);
    await userEvent.type(screen.getByLabelText('Confirm new password'), NEW_PASSWORD);
    await userEvent.press(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText('Your current password is incorrect')).toBeOnTheScreen();
    expect(mockSession.replaceSession).not.toHaveBeenCalled();
  });

  it('keeps the button off until the current password is typed and the new one is strong', async () => {
    await renderSettings(<PasswordSection />);
    const button = () => screen.getByRole('button', { name: 'Change password' });

    await userEvent.type(screen.getByLabelText('New password'), NEW_PASSWORD);

    await userEvent.type(screen.getByLabelText('Confirm new password'), NEW_PASSWORD);
    expect(button()).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Current password'), 'Subtrack#2026');
    expect(button()).toBeEnabled();

    await userEvent.clear(screen.getByLabelText('New password'));
    await userEvent.type(screen.getByLabelText('New password'), 'weakpass');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'weakpass');
    expect(button()).toBeDisabled();
  });

  it('keeps the button off while the two new passwords differ', async () => {
    await renderSettings(<PasswordSection />);

    await userEvent.type(screen.getByLabelText('Current password'), 'Subtrack#2026');
    await userEvent.type(screen.getByLabelText('New password'), NEW_PASSWORD);
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'Something#else1');

    expect(screen.getByText('The passwords do not match')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Change password' })).toBeDisabled();
  });

  it('lets an account that signed up with Google set its first password with an emailed code', async () => {
    mockUser.mockReturnValue(user({ hasPassword: false }));
    jest.mocked(userApi.sendConfirmationCode).mockResolvedValue(undefined);
    jest.mocked(userApi.changePassword).mockResolvedValue(session);
    await renderSettings(<PasswordSection />);

    expect(screen.getByRole('header', { name: 'Set a password' })).toBeOnTheScreen();
    expect(screen.queryByLabelText('Current password')).not.toBeOnTheScreen();

    await userEvent.type(screen.getByLabelText('New password'), NEW_PASSWORD);
    await userEvent.type(screen.getByLabelText('Confirm new password'), NEW_PASSWORD);
    // A strong password is not enough: the code proves who is setting it.
    expect(screen.getByRole('button', { name: 'Set password' })).toBeDisabled();

    await userEvent.press(screen.getByRole('button', { name: 'Email me a code' }));
    expect(userApi.sendConfirmationCode).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Enter the code we sent to demo@subtrack.example.')).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'Resend in 60s' })).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Code'), '123456');
    await userEvent.press(screen.getByRole('button', { name: 'Set password' }));

    expect(userApi.changePassword).toHaveBeenCalledWith({ confirmationCode: '123456' }, NEW_PASSWORD);
    expect(await screen.findByText('Password set')).toBeOnTheScreen();
  });

  it('says why when the code could not be emailed', async () => {
    mockUser.mockReturnValue(user({ hasPassword: false }));
    jest
      .mocked(userApi.sendConfirmationCode)
      .mockRejectedValue(new ApiError(429, 'RATE_LIMITED', 'Wait a minute before requesting another code'));
    await renderSettings(<PasswordSection />);

    await userEvent.press(screen.getByRole('button', { name: 'Email me a code' }));

    expect(await screen.findByText('Wait a minute before requesting another code')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Code')).not.toBeOnTheScreen();
  });
});

describe('sessions', () => {
  it('signs out of this device', async () => {
    await renderSettings(<SessionsSection />);

    await userEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    expect(mockSession.signOut).toHaveBeenCalled();
    expect(userApi.logoutEverywhere).not.toHaveBeenCalled();
  });

  it('signs out everywhere only after the confirmation is accepted', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(userApi.logoutEverywhere).mockResolvedValue(undefined);
    await renderSettings(<SessionsSection />);

    await userEvent.press(screen.getByRole('button', { name: 'Sign out of all devices' }));

    expect(alert).toHaveBeenCalledWith('Sign out of all devices?', expect.any(String), expect.any(Array));
    expect(userApi.logoutEverywhere).not.toHaveBeenCalled();

    const buttons = alert.mock.calls[0][2] ?? [];
    await act(async () => buttons.find((button) => button.style === 'destructive')?.onPress?.());

    expect(userApi.logoutEverywhere).toHaveBeenCalled();
    expect(mockSession.clearSession).toHaveBeenCalled();
    expect(mockSession.signOut).not.toHaveBeenCalled();
  });

  it('stays signed in when signing out everywhere fails', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(userApi.logoutEverywhere).mockRejectedValue(new ApiError(0, 'NETWORK', 'Could not reach the server. Check your connection and try again.'));
    await renderSettings(<SessionsSection />);

    await userEvent.press(screen.getByRole('button', { name: 'Sign out of all devices' }));
    const buttons = alert.mock.calls[0][2] ?? [];
    await act(async () => buttons.find((button) => button.style === 'destructive')?.onPress?.());

    expect(await screen.findByText('Could not reach the server. Check your connection and try again.')).toBeOnTheScreen();
    expect(mockSession.clearSession).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled();
  });
});
