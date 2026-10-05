import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

import { requestGoogleIdToken } from '@/lib/google-sign-in';

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn(), hasPlayServices: jest.fn(), signIn: jest.fn(), signOut: jest.fn() },
  statusCodes: { SIGN_IN_CANCELLED: 'cancelled', IN_PROGRESS: 'in-progress', PLAY_SERVICES_NOT_AVAILABLE: 'no-play' },
  isErrorWithCode: (error: unknown) => typeof error === 'object' && error !== null && 'code' in error,
}));

const CLIENT_ID = '123-abc.apps.googleusercontent.com';
const signIn = GoogleSignin.signIn as jest.Mock;

const withCode = (code: string) => Object.assign(new Error(code), { code });

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = CLIENT_ID;
  jest.mocked(GoogleSignin.hasPlayServices).mockResolvedValue(true);
  jest.mocked(GoogleSignin.signOut).mockResolvedValue(null);
});

describe('requestGoogleIdToken', () => {
  it('returns the ID token issued for the web client and forgets the Google session', async () => {
    signIn.mockResolvedValue({ type: 'success', data: { idToken: 'id-token' } });

    await expect(requestGoogleIdToken()).resolves.toBe('id-token');

    expect(GoogleSignin.configure).toHaveBeenCalledWith({ webClientId: CLIENT_ID });
    expect(GoogleSignin.signOut).toHaveBeenCalled();
  });

  it('returns nothing when the picker is closed', async () => {
    signIn.mockResolvedValue({ type: 'cancelled', data: null });
    await expect(requestGoogleIdToken()).resolves.toBeUndefined();

    signIn.mockRejectedValue(withCode(statusCodes.SIGN_IN_CANCELLED));
    await expect(requestGoogleIdToken()).resolves.toBeUndefined();
  });

  it('says so when no client id is configured, without opening Google', async () => {
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    await expect(requestGoogleIdToken()).rejects.toThrow('Google sign-in is not set up.');
    expect(GoogleSignin.signIn).not.toHaveBeenCalled();
  });

  it('explains missing Google Play services', async () => {
    jest.mocked(GoogleSignin.hasPlayServices).mockRejectedValue(withCode(statusCodes.PLAY_SERVICES_NOT_AVAILABLE));
    await expect(requestGoogleIdToken()).rejects.toThrow('Google Play services are missing');
  });

  it('fails when Google answers without an ID token', async () => {
    signIn.mockResolvedValue({ type: 'success', data: { idToken: null } });
    await expect(requestGoogleIdToken()).rejects.toThrow('Google did not confirm the sign-in');
  });

  it('hides the details of any other failure', async () => {
    signIn.mockRejectedValue(withCode('10'));
    await expect(requestGoogleIdToken()).rejects.toThrow('Could not sign in with Google. Try again.');
  });
});
