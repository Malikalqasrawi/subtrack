import { useAppearance } from '@/appearance/appearance-context';
import type { Appearance } from '@/appearance/appearance-storage';
import { Chips } from '@/components/chips';
import { SettingsSection } from '@/components/settings/section';

const OPTIONS: { value: Appearance; label: string }[] = [
  { value: 'system', label: 'Match system' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function AppearanceSection() {
  const { appearance, setAppearance } = useAppearance();
  return (
    <SettingsSection title="Appearance" note="Match system follows this phone's own light or dark setting.">
      <Chips accessibilityLabel="Appearance" options={OPTIONS} value={appearance} onChange={setAppearance} />
    </SettingsSection>
  );
}
