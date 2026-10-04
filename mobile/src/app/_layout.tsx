import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { queryClient } from '@/lib/query-client';
import { SessionProvider, useSession } from '@/session/session-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <Navigation />
      </SessionProvider>
    </QueryClientProvider>
  );
}

function Navigation() {
  const { user } = useSession();
  const theme = useTheme();
  const dark = useColorScheme() !== 'light';
  const restoring = user === undefined;

  // The splash screen stays up until we know whether a saved session exists.
  useEffect(() => {
    if (!restoring) SplashScreen.hideAsync();
  }, [restoring]);

  if (restoring) return null;

  const base = dark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: { ...base.colors, background: theme.background, card: theme.surface, border: theme.border, text: theme.text, primary: theme.accent },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={user !== null}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="subscription/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="subscription/[id]" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={user === null}>
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="register" />
          <Stack.Screen name="verify-email" />
          <Stack.Screen name="forgot-password" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
