import { act, renderHook, waitFor } from '@testing-library/react-native';

import { refreshSession, setAccessToken, setSessionExpiredHandler } from '@/api/client';
import { authApi } from '@/api/endpoints';
import type { Session } from '@/api/types';
import { queryClient } from '@/lib/query-client';
import { SessionProvider, useSession } from '@/session/session-context';
import { sessionStorage } from '@/session/session-storage';
import { user } from '@/test/fixtures';

jest.mock('@/api/endpoints');
jest.mock('@/session/session-storage');
jest.mock('@/api/client', () => ({
  ...jest.requireActual('@/api/client'),
  refreshSession: jest.fn(),
  setAccessToken: jest.fn(),
  setSessionExpiredHandler: jest.fn(),
}));

const SESSION: Session = { accessToken: 'access-1', expiresInSeconds: 900, user: user(), refreshToken: 'refresh-1' };

/** Starts the provider with a restored session and waits until it is ready. */
async function signedIn() {
  jest.mocked(refreshSession).mockResolvedValue(SESSION);
  const { result } = await renderHook(() => useSession(), { wrapper: SessionProvider });
  await waitFor(() => expect(result.current.user).toEqual(SESSION.user));
  jest.mocked(setAccessToken).mockClear();
  return result;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(queryClient, 'clear');
  jest.mocked(sessionStorage.read).mockResolvedValue('refresh-1');
  jest.mocked(authApi.logout).mockResolvedValue(undefined);
});

describe('SessionProvider', () => {
  it('restores the saved session when the app starts, and is undecided until then', async () => {
    let finishRestoring: (session: Session | null) => void = () => {};
    jest.mocked(refreshSession).mockReturnValue(new Promise((resolve) => (finishRestoring = resolve)));
    const { result } = await renderHook(() => useSession(), { wrapper: SessionProvider });

    expect(result.current.user).toBeUndefined();

    await act(async () => finishRestoring(SESSION));
    expect(result.current.user).toEqual(SESSION.user);
  });

  it('starts signed out when there is no saved session', async () => {
    jest.mocked(refreshSession).mockResolvedValue(null);
    const { result } = await renderHook(() => useSession(), { wrapper: SessionProvider });

    await waitFor(() => expect(result.current.user).toBeNull());
  });

  it('keeps the tokens issued after a password change, and the data already loaded', async () => {
    const session = await signedIn();
    const renewed: Session = { ...SESSION, accessToken: 'access-2', refreshToken: 'refresh-2', user: user({ hasPassword: true }) };

    await act(() => session.current.replaceSession(renewed));

    expect(setAccessToken).toHaveBeenCalledWith('access-2');
    expect(sessionStorage.write).toHaveBeenCalledWith('refresh-2');
    expect(session.current.user).toEqual(renewed.user);
    expect(queryClient.clear).not.toHaveBeenCalled();
  });

  it('shows a saved profile straight away', async () => {
    const session = await signedIn();

    await act(async () => session.current.updateUser(user({ displayName: 'Malik Demo', defaultCurrency: 'JOD' })));

    expect(session.current.user).toMatchObject({ displayName: 'Malik Demo', defaultCurrency: 'JOD' });
  });

  it('signs out on the server, then forgets the session on the device', async () => {
    const session = await signedIn();

    await act(() => session.current.signOut());

    expect(authApi.logout).toHaveBeenCalledWith('refresh-1');
    expect(sessionStorage.clear).toHaveBeenCalled();
    expect(queryClient.clear).toHaveBeenCalled();
    expect(setAccessToken).toHaveBeenCalledWith(null);
    expect(session.current.user).toBeNull();
  });

  it('still forgets the session when the server cannot be reached', async () => {
    jest.mocked(authApi.logout).mockRejectedValue(new Error('Could not reach the server'));
    const session = await signedIn();

    await act(() => session.current.signOut());

    expect(sessionStorage.clear).toHaveBeenCalled();
    expect(session.current.user).toBeNull();
  });

  it('can forget the session without calling the server again', async () => {
    const session = await signedIn();

    await act(() => session.current.clearSession());

    expect(authApi.logout).not.toHaveBeenCalled();
    expect(sessionStorage.clear).toHaveBeenCalled();
    expect(queryClient.clear).toHaveBeenCalled();
    expect(setAccessToken).toHaveBeenCalledWith(null);
    expect(session.current.user).toBeNull();
  });

  it('signs out when the API reports that the session has expired', async () => {
    const session = await signedIn();
    const onExpired = jest.mocked(setSessionExpiredHandler).mock.calls[0][0];

    await act(async () => onExpired());

    expect(session.current.user).toBeNull();
    expect(queryClient.clear).toHaveBeenCalled();
  });
});
