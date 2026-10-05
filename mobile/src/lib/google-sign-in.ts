export class GoogleSignInError extends Error {}

/**
 * Opens Google's account picker and returns the ID token to send to the API,
 * or nothing when the person closed the picker.
 */
export async function requestGoogleIdToken(): Promise<string | undefined> {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
  if (webClientId === '') throw new GoogleSignInError('Google sign-in is not set up.');

  const { GoogleSignin, isErrorWithCode, statusCodes } = loadLibrary();
  GoogleSignin.configure({ webClientId });
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (response.type !== 'success') return undefined;
    const { idToken } = response.data;
    // The session comes from the Subtrack API, so the Google one is dropped. The picker shows again next time.
    await GoogleSignin.signOut().catch(() => {});
    if (!idToken) throw new GoogleSignInError('Google did not confirm the sign-in. Try again.');
    return idToken;
  } catch (err) {
    if (err instanceof GoogleSignInError) throw err;
    if (isErrorWithCode(err)) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED || err.code === statusCodes.IN_PROGRESS) return undefined;
      if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new GoogleSignInError('Google Play services are missing or out of date on this phone.');
      }
    }
    throw new GoogleSignInError('Could not sign in with Google. Try again.');
  }
}

/** The library has native code, so it is missing in Expo Go and loading it there throws. */
function loadLibrary(): typeof import('@react-native-google-signin/google-signin') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-google-signin/google-signin');
  } catch {
    throw new GoogleSignInError('Google sign-in needs the installed app. It does not work in Expo Go.');
  }
}
