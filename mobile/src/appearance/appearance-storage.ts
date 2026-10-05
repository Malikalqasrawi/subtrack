import AsyncStorage from '@react-native-async-storage/async-storage';

export type Appearance = 'system' | 'light' | 'dark';

const KEY = 'subtrack.appearance';

/** The look chosen in Settings is kept on the phone, apart from any account. */
export const appearanceStorage = {
  async read(): Promise<Appearance> {
    try {
      const stored = await AsyncStorage.getItem(KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {
      // Not being able to read the choice is harmless: the phone's own setting is used.
    }
    return 'system';
  },
  write: (appearance: Appearance) =>
    appearance === 'system' ? AsyncStorage.removeItem(KEY) : AsyncStorage.setItem(KEY, appearance),
};
