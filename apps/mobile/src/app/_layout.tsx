import { colors } from '@setu/ui-tokens';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { queryClient } from '@/lib/api';
import { IS_PARTNER } from '@/lib/config';
import { SessionProvider, useSession } from '@/lib/session';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const c = scheme === 'dark' ? colors.dark : colors.light;
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: c.primary,
      background: c.background,
      card: c.surface,
      text: c.text,
      border: c.border,
    },
  };
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ThemeProvider value={theme}>
          <StatusBar style="auto" />
          <Routes />
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

function Routes() {
  const { status } = useSession();
  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync();
  }, [status]);
  if (status === 'loading') return null;
  const signedIn = status === 'signedIn';

  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="requirement/new"
          options={{ title: 'Post a requirement', presentation: 'modal' }}
        />
        <Stack.Screen name="requirement/[id]" options={{ title: 'Requirement' }} />
        <Stack.Screen name="quote/[id]" options={{ title: 'Quote' }} />
        <Stack.Screen name="job/[id]" options={{ title: 'Job' }} />
        <Stack.Screen name="lead/[id]" options={{ title: 'Lead' }} />
        <Stack.Screen
          name="onboarding"
          options={{ title: IS_PARTNER ? 'Your business' : 'Profile', headerBackVisible: false }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
