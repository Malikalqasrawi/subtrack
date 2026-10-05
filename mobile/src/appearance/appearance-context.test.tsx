import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Appearance as PhoneAppearance, useColorScheme as usePhoneColorScheme } from 'react-native';

import { AppearanceProvider, useAppearance } from '@/appearance/appearance-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** What a screen sees: the choice, the way to change it, and the colours that result. */
const useLook = () => ({ ...useAppearance(), scheme: useColorScheme() });

async function start() {
  const { result } = await renderHook(useLook, { wrapper: AppearanceProvider });
  await waitFor(() => expect(result.current.appearance).toBeDefined());
  return result;
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  jest.spyOn(PhoneAppearance, 'setColorScheme').mockImplementation(() => {});
  jest.mocked(usePhoneColorScheme).mockReturnValue('light');
});

describe('AppearanceProvider', () => {
  it('follows the phone until something else is chosen', async () => {
    const look = await start();

    expect(look.current.appearance).toBe('system');
    expect(look.current.scheme).toBe('light');
    expect(PhoneAppearance.setColorScheme).toHaveBeenCalledWith('unspecified');
  });

  it('uses the saved choice from the start, whatever the phone is set to', async () => {
    await AsyncStorage.setItem('subtrack.appearance', 'dark');

    const look = await start();

    expect(look.current.appearance).toBe('dark');
    expect(look.current.scheme).toBe('dark');
    expect(PhoneAppearance.setColorScheme).toHaveBeenCalledWith('dark');
  });

  it('is undecided until the saved choice has been read', async () => {
    let finishReading: (stored: string | null) => void = () => {};
    jest.mocked(AsyncStorage.getItem).mockReturnValueOnce(new Promise((resolve) => (finishReading = resolve)));
    const { result } = await renderHook(useLook, { wrapper: AppearanceProvider });

    expect(result.current.appearance).toBeUndefined();

    await act(async () => finishReading('light'));
    expect(result.current.appearance).toBe('light');
  });

  it('switches at once, tells the phone and remembers the choice', async () => {
    const look = await start();

    await act(async () => look.current.setAppearance('dark'));

    expect(look.current.scheme).toBe('dark');
    expect(PhoneAppearance.setColorScheme).toHaveBeenLastCalledWith('dark');
    expect(await AsyncStorage.getItem('subtrack.appearance')).toBe('dark');

    await act(async () => look.current.setAppearance('system'));

    expect(look.current.scheme).toBe('light');
    expect(PhoneAppearance.setColorScheme).toHaveBeenLastCalledWith('unspecified');
    expect(await AsyncStorage.getItem('subtrack.appearance')).toBeNull();
  });

  it('still switches when the choice cannot be saved', async () => {
    const look = await start();
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('Storage is full'));

    await act(async () => look.current.setAppearance('dark'));

    expect(look.current.scheme).toBe('dark');
  });
});

describe('useColorScheme', () => {
  it('follows the phone when the choice is Match system', async () => {
    jest.mocked(usePhoneColorScheme).mockReturnValue('dark');

    const look = await start();

    expect(look.current.scheme).toBe('dark');
  });

  it('is dark when the phone gives no answer', async () => {
    jest.mocked(usePhoneColorScheme).mockReturnValue('unspecified');

    const look = await start();

    expect(look.current.scheme).toBe('dark');
  });

  it('follows the phone outside the provider', async () => {
    const { result } = await renderHook(useLook);

    expect(result.current.appearance).toBe('system');
    expect(result.current.scheme).toBe('light');
  });
});
