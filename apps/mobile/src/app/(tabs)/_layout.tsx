import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { Loading } from '@/components/ui';
import { $api } from '@/lib/api';
import { IS_PARTNER } from '@/lib/config';
import { useI18n } from '@/lib/i18n';
import { usePalette } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color as string} size={size} />
  );

export default function TabsLayout() {
  const c = usePalette();
  const { t } = useI18n();
  // Partners finish their business profile before seeing leads.
  const partner = $api.useQuery(
    'get',
    '/v1/partners/me',
    {},
    { enabled: IS_PARTNER, retry: false },
  );
  if (IS_PARTNER && partner.isPending) return <Loading />;
  if (IS_PARTNER && partner.error) return <Redirect href="/onboarding" />;

  const show = (forPartner: boolean) => (IS_PARTNER === forPartner ? undefined : null);
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
        headerStyle: { backgroundColor: c.background },
        headerTintColor: c.text,
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="home"
        options={{ title: t('Home'), href: show(false), tabBarIcon: icon('home-outline') }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: t('My requests'),
          href: show(false),
          tabBarIcon: icon('document-text-outline'),
        }}
      />
      <Tabs.Screen
        name="leads"
        options={{ title: t('Leads'), href: show(true), tabBarIcon: icon('flash-outline') }}
      />
      <Tabs.Screen
        name="jobs"
        options={{ title: t('Jobs'), tabBarIcon: icon('construct-outline') }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: t('Account'), tabBarIcon: icon('person-circle-outline') }}
      />
    </Tabs>
  );
}
