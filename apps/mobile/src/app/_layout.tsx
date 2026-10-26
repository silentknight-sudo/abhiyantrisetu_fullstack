import { colors } from '@setu/ui-tokens';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { queryClient } from '@/lib/api';
import { IS_PARTNER } from '@/lib/config';
import { I18nProvider, useI18n } from '@/lib/i18n';
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
        <I18nProvider>
          <ThemeProvider value={theme}>
            <StatusBar style="auto" />
            <Routes />
          </ThemeProvider>
        </I18nProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

function Routes() {
  const { status } = useSession();
  const { t } = useI18n();
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
          options={{ title: t('Post a requirement'), presentation: 'modal' }}
        />
        <Stack.Screen name="requirement/[id]" options={{ title: t('Requirement') }} />
        <Stack.Screen name="quote/[id]" options={{ title: t('Quote') }} />
        <Stack.Screen name="job/[id]" options={{ title: t('Job') }} />
        <Stack.Screen name="lead/[id]" options={{ title: t('Lead') }} />
        <Stack.Screen
          name="onboarding"
          options={{
            title: IS_PARTNER ? t('Your business') : t('Profile'),
            headerBackVisible: false,
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
