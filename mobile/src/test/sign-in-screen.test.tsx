import { fireEvent, screen, userEvent } from '@testing-library/react-native';

import { ApiError } from '@/api/client';
import { authApi } from '@/api/endpoints';
import type { Session } from '@/api/types';
import SignInScreen from '@/app/sign-in';
import { GoogleSignInError, requestGoogleIdToken } from '@/lib/google-sign-in';
import { pendingVerification } from '@/session/pending-verification';
import { user } from '@/test/fixtures';
import { renderScreen } from '@/test/render-screen';

const mockRouter = { push: jest.fn(), dismissTo: jest.fn() };
const mockSignIn = jest.fn();
const mockParams = jest.fn();

jest.mock('@/api/endpoints');
jest.mock('@/lib/google-sign-in', () => ({
  ...jest.requireActual('@/lib/google-sign-in'),
  requestGoogleIdToken: jest.fn(),
}));
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => mockParams() }));
jest.mock('@/session/session-context', () => ({ useSession: () => ({ signIn: mockSignIn }) }));

const PASSWORD = 'Subtrack#2026';
const SESSION: Session = { accessToken: 'access', expiresInSeconds: 900, user: user(), refreshToken: 'refresh' };

async function signInWith(email: string) {
  await renderScreen(<SignInScreen />);
  await userEvent.type(screen.getByLabelText('Email'), email);
  await userEvent.type(screen.getByLabelText('Password'), PASSWORD);
  await userEvent.press(screen.getByRole('button', { name: 'Sign in' }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.mockReturnValue({});
  pendingVerification.clear();
});

describe('SignInScreen', () => {
  it('starts the session when the password is right', async () => {
    jest.mocked(authApi.login).mockResolvedValue({ ...SESSION, twoFactorRequired: false });
    await signInWith(' demo@subtrack.example ');

    expect(authApi.login).toHaveBeenCalledWith('demo@subtrack.example', PASSWORD);
    expect(mockSignIn).toHaveBeenCalledWith(expect.objectContaining({ refreshToken: 'refresh' }));
  });

  it('signs in when Enter is pressed in the password box', async () => {
    jest.mocked(authApi.login).mockResolvedValue({ ...SESSION, twoFactorRequired: false });
    await renderScreen(<SignInScreen />);

    await userEvent.type(screen.getByLabelText('Email'), 'demo@subtrack.example');
    await userEvent.type(screen.getByLabelText('Password'), PASSWORD, { submitEditing: true });

    expect(authApi.login).toHaveBeenCalledWith('demo@subtrack.example', PASSWORD);
  });

  it('ignores Enter while the email is still empty', async () => {
    await renderScreen(<SignInScreen />);

    await userEvent.type(screen.getByLabelText('Password'), PASSWORD, { submitEditing: true });

    expect(authApi.login).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  it('sends one request however often Enter is pressed while it is on its way', async () => {
    jest.mocked(authApi.login).mockReturnValue(new Promise(() => {}));
    await renderScreen(<SignInScreen />);

    await userEvent.type(screen.getByLabelText('Email'), 'demo@subtrack.example');
    await userEvent.type(screen.getByLabelText('Password'), PASSWORD, { submitEditing: true });
    await fireEvent(screen.getByLabelText('Password'), 'submitEditing');

    expect(authApi.login).toHaveBeenCalledTimes(1);
  });

  it('ignores Enter on the second step until the code is long enough', async () => {
    jest.mocked(authApi.login).mockResolvedValue({ twoFactorRequired: true, challengeToken: 'challenge' });
    await signInWith('demo@subtrack.example');

    await userEvent.type(screen.getByLabelText('Code'), '12345', { submitEditing: true });

    expect(authApi.twoFactor).not.toHaveBeenCalled();
  });

  it('asks for the second factor before starting the session', async () => {
    jest.mocked(authApi.login).mockResolvedValue({ twoFactorRequired: true, challengeToken: 'challenge' });
    jest.mocked(authApi.twoFactor).mockResolvedValue(SESSION);
    await signInWith('demo@subtrack.example');

    expect(mockSignIn).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText('Code'), '123456');
    await userEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(authApi.twoFactor).toHaveBeenCalledWith('challenge', '123456');
    expect(mockSignIn).toHaveBeenCalledWith(SESSION);
  });

  it('shows the same message for a wrong email and a wrong password', async () => {
    jest.mocked(authApi.login).mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'));
    await signInWith('demo@subtrack.example');

    expect(await screen.findByText('Invalid email or password')).toBeOnTheScreen();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('sends an unverified account a new code and on to the verify screen', async () => {
    jest.mocked(authApi.login).mockRejectedValue(new ApiError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email first'));
    jest.mocked(authApi.resendVerification).mockResolvedValue(undefined);
    await signInWith('demo@subtrack.example');

    expect(authApi.resendVerification).toHaveBeenCalledWith('demo@subtrack.example');
    expect(pendingVerification.get()).toEqual({ email: 'demo@subtrack.example', password: PASSWORD });
    expect(mockRouter.push).toHaveBeenCalledWith('/verify-email');
  });

  it('signs in with the ID token Google returns', async () => {
    jest.mocked(requestGoogleIdToken).mockResolvedValue('id-token');
    jest.mocked(authApi.google).mockResolvedValue({ ...SESSION, twoFactorRequired: false });
    await renderScreen(<SignInScreen />);

    await userEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(authApi.google).toHaveBeenCalledWith('id-token');
    expect(mockSignIn).toHaveBeenCalledWith(expect.objectContaining({ refreshToken: 'refresh' }));
  });

  it('asks a Google account with two-factor on for its code', async () => {
    jest.mocked(requestGoogleIdToken).mockResolvedValue('id-token');
    jest.mocked(authApi.google).mockResolvedValue({ twoFactorRequired: true, challengeToken: 'challenge' });
    await renderScreen(<SignInScreen />);

    await userEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(await screen.findByLabelText('Code')).toBeOnTheScreen();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('does nothing when the Google picker is closed', async () => {
    jest.mocked(requestGoogleIdToken).mockResolvedValue(undefined);
    await renderScreen(<SignInScreen />);

    await userEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(authApi.google).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  it('shows why Google sign-in failed', async () => {
    jest.mocked(requestGoogleIdToken).mockRejectedValue(new GoogleSignInError('Google sign-in is not set up.'));
    await renderScreen(<SignInScreen />);

    await userEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(await screen.findByText('Google sign-in is not set up.')).toBeOnTheScreen();
  });

  it('opens on the code step when a challenge is handed over', async () => {
    mockParams.mockReturnValue({ challengeToken: 'challenge' });
    jest.mocked(authApi.twoFactor).mockResolvedValue(SESSION);
    await renderScreen(<SignInScreen />);

    await userEvent.type(screen.getByLabelText('Code'), '123456');
    await userEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(authApi.twoFactor).toHaveBeenCalledWith('challenge', '123456');
  });

  it('confirms a password change made on the reset screen', async () => {
    mockParams.mockReturnValue({ passwordChanged: '1' });
    await renderScreen(<SignInScreen />);

    expect(screen.getByText('Password changed. Sign in with your new password.')).toBeOnTheScreen();
  });

  it('carries the typed email to the forgot-password screen', async () => {
    await renderScreen(<SignInScreen />);
    await userEvent.type(screen.getByLabelText('Email'), 'demo@subtrack.example');
    await userEvent.press(screen.getByRole('link', { name: 'Forgot password?' }));

    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/forgot-password', params: { email: 'demo@subtrack.example' } });
  });
});
