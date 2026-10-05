import { Platform } from 'react-native';

export const Colors = {
  light: {
    background: '#F3F5F7',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF1F4',
    border: '#DDE2E8',
    text: '#0C1118',
    textSecondary: '#4A5565',
    textMuted: '#6B7686',
    accent: '#0A7D4D',
    accentSoft: '#E0F4EA',
    onAccent: '#FFFFFF',
    danger: '#B42C2C',
    dangerSoft: '#FBE9E9',
    warning: '#8A5A00',
    warningSoft: '#FBF0D9',
  },
  dark: {
    background: '#080B10',
    surface: '#0F141B',
    surfaceAlt: '#151B24',
    border: '#212A36',
    text: '#E9EEF5',
    textSecondary: '#A6B1C2',
    textMuted: '#7D899B',
    accent: '#2EE59D',
    accentSoft: '#0F2A20',
    onAccent: '#04130C',
    danger: '#FF8F8F',
    dangerSoft: '#3A1B1B',
    warning: '#F5C451',
    warningSoft: '#33290F',
  },
} as const;

export type Theme = { [Key in keyof typeof Colors.dark]: string };

/** The hero panel stays dark in both themes, with light text on top. */
export const Hero = {
  background: '#0D2A20',
  border: 'rgba(46, 229, 157, 0.18)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.8)',
  value: '#2EE59D',
  tile: 'rgba(255, 255, 255, 0.06)',
  tileBorder: 'rgba(255, 255, 255, 0.12)',
} as const;

export const Fonts = {
  mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
} as const;

export const Radius = {
  small: 10,
  medium: 12,
  large: 14,
} as const;
