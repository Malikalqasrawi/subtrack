import type { Feather } from '@expo/vector-icons';
import type { ComponentProps, ComponentType } from 'react';

import type { User } from '@/api/types';
import { AppearanceSection } from '@/components/settings/appearance-section';
import { DangerZone } from '@/components/settings/danger-zone';
import { EmailSection } from '@/components/settings/email-section';
import { PasswordSection } from '@/components/settings/password-section';
import { ProfileSection } from '@/components/settings/profile-section';
import { SessionsSection } from '@/components/settings/sessions-section';
import { TwoFactorSection } from '@/components/settings/two-factor-section';

export interface SettingsEntry {
  /** The last part of the screen's address: /settings/<key>. */
  key: string;
  label: string;
  icon: ComponentProps<typeof Feather>['name'];
  summary: (user: User) => string;
  danger?: boolean;
  Section: ComponentType;
}

/** Every settings screen, in the order the menu lists them. */
export const SETTINGS: SettingsEntry[] = [
  { key: 'profile', label: 'Profile', icon: 'user', summary: () => 'Name, phone number and currency', Section: ProfileSection },
  { key: 'appearance', label: 'Appearance', icon: 'moon', summary: () => 'Light, dark or like this phone', Section: AppearanceSection },
  { key: 'email', label: 'Email address', icon: 'mail', summary: (user) => user.email, Section: EmailSection },
  {
    key: 'password',
    label: 'Password',
    icon: 'lock',
    summary: (user) => (user.hasPassword ? 'Change your password' : 'Set a password to sign in with your email'),
    Section: PasswordSection,
  },
  {
    key: 'two-factor',
    label: 'Two-factor authentication',
    icon: 'shield',
    summary: (user) => (user.twoFactorEnabled ? 'On' : 'Off'),
    Section: TwoFactorSection,
  },
  { key: 'sessions', label: 'Sign out', icon: 'log-out', summary: () => 'This device or all devices', Section: SessionsSection },
  {
    key: 'delete-account',
    label: 'Delete account',
    icon: 'trash-2',
    summary: () => 'Remove the account and everything in it',
    danger: true,
    Section: DangerZone,
  },
];
