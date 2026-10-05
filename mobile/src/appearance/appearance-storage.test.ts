import AsyncStorage from '@react-native-async-storage/async-storage';

import { appearanceStorage } from '@/appearance/appearance-storage';

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('appearanceStorage', () => {
  it('follows the phone when nothing was chosen', async () => {
    expect(await appearanceStorage.read()).toBe('system');
  });

  it.each(['light', 'dark'] as const)('remembers %s', async (choice) => {
    await appearanceStorage.write(choice);

    expect(await appearanceStorage.read()).toBe(choice);
  });

  it('forgets the choice when it goes back to matching the phone', async () => {
    await appearanceStorage.write('dark');
    await appearanceStorage.write('system');

    expect(await appearanceStorage.read()).toBe('system');
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });

  it('ignores a saved value it does not know', async () => {
    await AsyncStorage.setItem('subtrack.appearance', 'sepia');

    expect(await appearanceStorage.read()).toBe('system');
  });

  it('follows the phone when the storage cannot be read', async () => {
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('Storage is not available'));

    expect(await appearanceStorage.read()).toBe('system');
  });
});
