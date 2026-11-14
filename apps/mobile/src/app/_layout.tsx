import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import {
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
} from '@expo-google-fonts/baloo-2';
import { useFonts } from 'expo-font';
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
import { usePalette } from '@/lib/theme';
import { font } from '@/lib/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const c = usePalette();
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
  // Baloo 2 for headings (reads well in Hindi too), Inter for text.
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
  });
  const ready = status !== 'loading' && (fontsLoaded || Boolean(fontError));
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;
  const signedIn = status === 'signedIn';

  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: font.heading, fontSize: 17 },
      }}
    >
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
        <Stack.Screen name="assistant" options={{ title: 'Setu AI' }} />
        <Stack.Screen name="calculator" options={{ title: t('Cost calculator') }} />
        <Stack.Screen name="notifications" options={{ title: t('Notifications') }} />
        <Stack.Screen name="earnings" options={{ title: t('Earnings') }} />
        <Stack.Screen name="book/[category]" options={{ title: t('Book a service') }} />
        <Stack.Screen name="book/checkout" options={{ title: t('Checkout') }} />
        <Stack.Screen name="book/pros" options={{ title: t('Choose your professional') }} />
        <Stack.Screen name="book/reviews" options={{ title: t('Reviews') }} />
        <Stack.Screen name="professionals" options={{ title: t('Find a professional') }} />
        <Stack.Screen name="refer" options={{ title: t('Refer and earn') }} />
        <Stack.Screen name="documents" options={{ title: t('My documents') }} />
        <Stack.Screen name="report" options={{ title: t('Report a professional') }} />
        <Stack.Screen name="care-plans" options={{ title: t('Care plans') }} />
        <Stack.Screen name="society" options={{ title: t('Societies and builders') }} />
        <Stack.Screen
          name="consent"
          options={{ title: t('Before you continue'), gestureEnabled: false }}
        />
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
