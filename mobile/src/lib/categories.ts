import type { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { Category } from '@/api/types';

type IconName = ComponentProps<typeof Feather>['name'];

/** Each category has its own icon and its own place on the colour wheel. */
const LOOK: Record<Category, { icon: IconName; hue: number }> = {
  ENTERTAINMENT: { icon: 'film', hue: 350 },
  MUSIC: { icon: 'music', hue: 140 },
  GAMING: { icon: 'play-circle', hue: 265 },
  PRODUCTIVITY: { icon: 'briefcase', hue: 212 },
  CLOUD: { icon: 'cloud', hue: 190 },
  EDUCATION: { icon: 'book-open', hue: 38 },
  HEALTH: { icon: 'activity', hue: 325 },
  NEWS: { icon: 'file-text', hue: 228 },
  UTILITIES: { icon: 'zap', hue: 52 },
  FINANCE: { icon: 'dollar-sign', hue: 165 },
  SHOPPING: { icon: 'shopping-bag', hue: 22 },
  OTHER: { icon: 'grid', hue: 240 },
};

export const categoryIcon = (category: Category) => LOOK[category].icon;

/**
 * The colours of a category: a soft tile, the ink drawn on it, and a solid for charts.
 * Derived from one hue so the two themes stay in step.
 */
export function categoryColors(category: Category, dark: boolean) {
  const { hue } = LOOK[category];
  return {
    tile: `hsl(${hue}, ${dark ? 45 : 70}%, ${dark ? 18 : 93}%)`,
    ink: `hsl(${hue}, ${dark ? 85 : 65}%, ${dark ? 74 : 36}%)`,
    solid: `hsl(${hue}, ${dark ? 70 : 62}%, ${dark ? 62 : 46}%)`,
  };
}
