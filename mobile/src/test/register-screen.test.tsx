import { screen, userEvent } from '@testing-library/react-native';

import { ApiError } from '@/api/client';
import { authApi } from '@/api/endpoints';
import type { Session } from '@/api/types';
import RegisterScreen from '@/app/register';
import { requestGoogleIdToken } from '@/lib/google-sign-in';
import { pendingVerification } from '@/session/pending-verification';
import { user } from '@/test/fixtures';
import { renderScreen } from '@/test/render-screen';

const mockRouter = { push: jest.fn(), dismissTo: jest.fn() };
const mockSignIn = jest.fn();

jest.mock('@/api/endpoints');
jest.mock('@/lib/google-sign-in');
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('@/session/session-context', () => ({ useSession: () => ({ signIn: mockSignIn }) }));

const PASSWORD = 'Subtrack#2026';

async function fillIn(phone: string) {
  await userEvent.type(screen.getByLabelText('Name'), 'Malik Demo');
  await userEvent.type(screen.getByLabelText('Email'), ' demo@subtrack.example ');
  await userEvent.type(screen.getByLabelText('Phone number'), phone);
  await userEvent.type(screen.getByLabelText('Password'), PASSWORD);
}

beforeEach(() => {
  jest.clearAllMocks();
  pendingVerification.clear();
});

describe('RegisterScreen', () => {
  it('keeps the button off until the password meets every rule', async () => {
    await renderScreen(<RegisterScreen />);
    await userEvent.type(screen.getByLabelText('Name'), 'Malik Demo');
    await userEvent.type(screen.getByLabelText('Email'), 'demo@subtrack.example');
    await userEvent.type(screen.getByLabelText('Phone number'), '+962791234567');
    await userEvent.type(screen.getByLabelText('Password'), 'weakpass');

    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
    expect(screen.getByLabelText('A number: not met')).toBeOnTheScreen();
    expect(screen.getByLabelText('A letter: met')).toBeOnTheScreen();
  });

  it('registers with a cleaned-up phone number and moves on to the email code', async () => {
    jest.mocked(authApi.register).mockResolvedValue(undefined);
    await renderScreen(<RegisterScreen />);
    await fillIn('+962 79 123-4567');
    await userEvent.press(screen.getByRole('button', { name: 'Create account' }));

    expect(authApi.register).toHaveBeenCalledWith('demo@subtrack.example', PASSWORD, 'Malik Demo', '+962791234567');
    expect(pendingVerification.get()).toEqual({ email: 'demo@subtrack.example', password: PASSWORD });
    expect(mockRouter.push).toHaveBeenCalledWith('/verify-email');
  });

  it('stops a badly formed email before calling the API', async () => {
    await renderScreen(<RegisterScreen />);
    await userEvent.type(screen.getByLabelText('Name'), 'Malik Demo');
    await userEvent.type(screen.getByLabelText('Email'), 'demo@subtrack');
    await userEvent.type(screen.getByLabelText('Phone number'), '+962791234567');
    await userEvent.type(screen.getByLabelText('Password'), PASSWORD);
    await userEvent.press(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Enter a full email address, like name@example.com')).toBeOnTheScreen();
    expect(authApi.register).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('stops a phone number without a country code before calling the API', async () => {
    await renderScreen(<RegisterScreen />);
    await fillIn('0791234567');
    await userEvent.press(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Use international format, for example +962791234567')).toBeOnTheScreen();
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('shows the errors the API sends back and stays on the screen', async () => {
    jest.mocked(authApi.register).mockRejectedValue(
      new ApiError(400, 'VALIDATION', 'Check the form', { displayName: 'can only contain letters, spaces, apostrophes and hyphens' }),
    );
    await renderScreen(<RegisterScreen />);
    await fillIn('+962791234567');
    await userEvent.press(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('can only contain letters, spaces, apostrophes and hyphens')).toBeOnTheScreen();
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(pendingVerification.get()).toBeNull();
  });

  it('starts the session for an account created with Google', async () => {
    const session: Session = { accessToken: 'access', expiresInSeconds: 900, user: user(), refreshToken: 'refresh' };
    jest.mocked(requestGoogleIdToken).mockResolvedValue('id-token');
    jest.mocked(authApi.google).mockResolvedValue({ ...session, twoFactorRequired: false });
    await renderScreen(<RegisterScreen />);

    await userEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(authApi.google).toHaveBeenCalledWith('id-token');
    expect(mockSignIn).toHaveBeenCalledWith(expect.objectContaining({ refreshToken: 'refresh' }));
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('sends a Google account with two-factor on to the code step', async () => {
    jest.mocked(requestGoogleIdToken).mockResolvedValue('id-token');
    jest.mocked(authApi.google).mockResolvedValue({ twoFactorRequired: true, challengeToken: 'challenge' });
    await renderScreen(<RegisterScreen />);

    await userEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(mockRouter.dismissTo).toHaveBeenCalledWith({ pathname: '/sign-in', params: { challengeToken: 'challenge' } });
    expect(mockSignIn).not.toHaveBeenCalled();
  });
});
