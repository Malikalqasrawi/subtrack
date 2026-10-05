import { useColorScheme as usePhoneColorScheme } from 'react-native';

import { useAppearance } from '@/appearance/appearance-context';

/** The look chosen in Settings, or the phone's own setting when that choice is "Match system". */
export function useColorScheme(): 'light' | 'dark' {
  const phone = usePhoneColorScheme();
  const { appearance } = useAppearance();
  if (appearance === 'light' || appearance === 'dark') return appearance;
  return phone === 'light' ? 'light' : 'dark';
}
