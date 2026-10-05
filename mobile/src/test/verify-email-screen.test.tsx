import { act, screen, userEvent } from '@testing-library/react-native';

import { ApiError } from '@/api/client';
import { authApi } from '@/api/endpoints';
import type { Session } from '@/api/types';
import VerifyEmailScreen from '@/app/verify-email';
import { pendingVerification } from '@/session/pending-verification';
import { user } from '@/test/fixtures';
import { renderScreen } from '@/test/render-screen';

const mockRouter = { push: jest.fn(), dismissTo: jest.fn() };
const mockRedirect = jest.fn();
const mockSignIn = jest.fn();

jest.mock('@/api/endpoints');
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(href);
    return null;
  },
}));
jest.mock('@/session/session-context', () => ({ useSession: () => ({ signIn: mockSignIn }) }));

const CREDENTIALS = { email: 'demo@subtrack.example', password: 'Subtrack#2026' };
const SESSION: Session = { accessToken: 'access', expiresInSeconds: 900, user: user(), refreshToken: 'refresh' };

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  pendingVerification.set(CREDENTIALS);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('VerifyEmailScreen', () => {
  it('goes back to sign in when there is no account waiting for a code', async () => {
    pendingVerification.clear();
    await renderScreen(<VerifyEmailScreen />);

    expect(mockRedirect).toHaveBeenCalledWith('/sign-in');
  });

  it('signs in with the verified session and forgets the password', async () => {
    jest.mocked(authApi.verify).mockResolvedValue(SESSION);
    await renderScreen(<VerifyEmailScreen />);

    await userEvent.type(screen.getByLabelText('Code'), '12a3456');
    await userEvent.press(screen.getByRole('button', { name: 'Verify email' }));

    expect(authApi.verify).toHaveBeenCalledWith(CREDENTIALS.email, CREDENTIALS.password, '123456');
    expect(mockSignIn).toHaveBeenCalledWith(SESSION);
    expect(pendingVerification.get()).toBeNull();
  });

  it('ignores Enter until all six digits are typed', async () => {
    await renderScreen(<VerifyEmailScreen />);

    await userEvent.type(screen.getByLabelText('Code'), '12345', { submitEditing: true });

    expect(authApi.verify).not.toHaveBeenCalled();
  });

  it('shows why a code was refused and clears the box for another try', async () => {
    jest.mocked(authApi.verify).mockRejectedValue(new ApiError(400, 'INVALID_CODE', 'That code is invalid or has expired'));
    await renderScreen(<VerifyEmailScreen />);

    await userEvent.type(screen.getByLabelText('Code'), '000000');
    await userEvent.press(screen.getByRole('button', { name: 'Verify email' }));

    expect(await screen.findByText('That code is invalid or has expired')).toBeOnTheScreen();
    expect(screen.getByLabelText('Code')).toHaveDisplayValue('');
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('lets a new code be requested only after the cooldown', async () => {
    jest.mocked(authApi.resendVerification).mockResolvedValue(undefined);
    await renderScreen(<VerifyEmailScreen />);

    expect(screen.getByRole('link', { name: 'Resend in 60s' })).toBeDisabled();

    // One tick at a time: each second is scheduled only after the previous one has rendered.
    for (let second = 0; second < 60; second++) await act(() => jest.advanceTimersByTimeAsync(1000));
    await userEvent.press(screen.getByRole('link', { name: 'Resend code' }));

    expect(authApi.resendVerification).toHaveBeenCalledWith(CREDENTIALS.email);
    expect(await screen.findByText('A new code is on its way.')).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'Resend in 60s' })).toBeDisabled();
  });
});
