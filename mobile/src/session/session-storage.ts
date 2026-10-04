import * as SecureStore from 'expo-secure-store';

const KEY = 'subtrack.refreshToken';

/** The refresh token lives in the phone's encrypted storage (Keychain on iOS, Keystore on Android). */
export const sessionStorage = {
  read: () => SecureStore.getItemAsync(KEY),
  write: (refreshToken: string) => SecureStore.setItemAsync(KEY, refreshToken),
  clear: () => SecureStore.deleteItemAsync(KEY),
};
