import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance as PhoneAppearance } from 'react-native';

import { appearanceStorage, type Appearance } from '@/appearance/appearance-storage';

interface AppearanceState {
  /** `undefined` while the saved choice is still being read. */
  appearance: Appearance | undefined;
  setAppearance: (appearance: Appearance) => void;
}

// Outside the provider the app simply follows the phone.
const AppearanceContext = createContext<AppearanceState>({ appearance: 'system', setAppearance: () => {} });

/** Tells the phone too, so its own dialogs, pickers and keyboard match the app. */
function apply(appearance: Appearance) {
  PhoneAppearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance);
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setChoice] = useState<Appearance>();

  useEffect(() => {
    appearanceStorage.read().then((saved) => {
      apply(saved);
      setChoice(saved);
    });
  }, []);

  const setAppearance = useCallback((next: Appearance) => {
    apply(next);
    setChoice(next);
    // Not being able to remember the choice is harmless.
    appearanceStorage.write(next).catch(() => {});
  }, []);

  const value = useMemo(() => ({ appearance, setAppearance }), [appearance, setAppearance]);
  return <AppearanceContext value={value}>{children}</AppearanceContext>;
}

export const useAppearance = () => use(AppearanceContext);
