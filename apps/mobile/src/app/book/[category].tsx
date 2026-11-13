import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CartBar, QtyStepper } from '@/components/booking';
import { Banner, Button, Chip, Empty, Loading, Notice, Small, TrustRow } from '@/components/ui';
import { $api } from '@/lib/api';
import { BANNERS } from '@/lib/banners';
import { BOOKABLE, cartStore, useCart } from '@/lib/cart';
import { errorMessage } from '@/lib/errors';
import { rupees } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { font, shadow, spacing, typeScale, usePalette } from '@/lib/theme';

/** The instant-booking menu for one category: grouped services, prices and a live cart. */
export default function BookMenu() {
  const { t, locale } = useI18n();
  const c = usePalette();
  const { category } = useLocalSearchParams<{ category: string }>();
  const menu = $api.useQuery('get', '/v1/catalog/services', {
    params: { query: { category } },
  });
  const cart = useCart();
  const reviews = $api.useQuery('get', '/v1/catalog/reviews', { params: { query: { category } } });
  const [group, setGroup] = useState<string | null>(null);
  const hi = locale === 'hi';

  const groups = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of menu.data ?? []) {
      if (s.groupEn && !seen.has(s.groupEn)) seen.set(s.groupEn, (hi && s.groupHi) || s.groupEn);
    }
    return [...seen];
  }, [menu.data, hi]);
  const shown = (menu.data ?? []).filter((s) => !group || s.groupEn === group);
  const sections = groups
    .filter(([en]) => !group || en === group)
    .map(([en, label]) => ({ label, items: shown.filter((s) => s.groupEn === en) }));
  const inCart = cart.category === category;
  const title = t(BOOKABLE[category] ?? 'Book a service');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={[]}>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing[8] }}>
        <Banner
          image={BANNERS.homeServices}
          rounded={false}
          height={170}
          eyebrow={t('Fixed prices · no haggling')}
          title={title}
          body={t(
            'Verified professionals near you. Your money is held safely until the work is done.',
          )}
        />
        <View style={{ padding: spacing[4], gap: spacing[4] }}>
          {reviews.data && reviews.data.total > 0 ? (
            <Pressable
              accessibilityRole="button"
              testID="category-reviews"
              onPress={() => router.push({ pathname: '/book/reviews', params: { category } })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}
            >
              <Text style={[typeScale.base, { color: c.text, fontFamily: font.heading }]}>
                ★ {reviews.data.average?.toFixed(2)}
              </Text>
              <Text
                style={[
                  typeScale.sm,
                  { color: c.text, fontFamily: font.medium, textDecorationLine: 'underline' },
                ]}
              >
                {t('{n} reviews', { n: reviews.data.total })}
              </Text>
            </Pressable>
          ) : null}
          <TrustRow
            items={[
              ['shield-checkmark', t('Verified pros')],
              ['pricetag', t('Prices fixed upfront')],
              ['ribbon', t('30-day warranty')],
            ]}
          />

          {menu.isPending ? <Loading /> : null}
          {menu.error ? <Notice>{errorMessage(menu.error)}</Notice> : null}
          {menu.data && menu.data.length === 0 ? (
            <Empty
              icon="construct-outline"
              title={t('No fixed-price menu here yet')}
              body={t('Describe the work and get quotes from verified professionals instead.')}
            />
          ) : null}

          {groups.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                <Chip label={t('All')} selected={!group} onPress={() => setGroup(null)} />
                {groups.map(([en, label]) => (
                  <Chip
                    key={en}
                    label={label}
                    selected={group === en}
                    onPress={() => setGroup(group === en ? null : en)}
                  />
                ))}
              </View>
            </ScrollView>
          ) : null}

          {sections.map((sec) => (
            <View key={sec.label} style={{ gap: spacing[3] }}>
              <Text style={[typeScale.lg, { color: c.text, fontFamily: font.heading }]}>
                {sec.label}
              </Text>
              {sec.items.map((s) => {
                const name = (hi && s.nameHi) || s.nameEn;
                return (
                  <View
                    key={s.id}
                    style={[
                      shadow,
                      {
                        flexDirection: 'row',
                        gap: spacing[3],
                        padding: spacing[4],
                        borderRadius: 18,
                        backgroundColor: c.surface,
                        borderWidth: 1,
                        borderColor: inCart && cart.qty(s.id) ? c.accent : c.border,
                      },
                    ]}
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[typeScale.base, { color: c.text, fontFamily: font.heading }]}>
                        {name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text
                          style={[typeScale.base, { color: c.text, fontFamily: font.semibold }]}
                        >
                          {rupees(s.pricePaise)}
                        </Text>
                        <Small>
                          {s.unit}
                          {s.durationMinutes ? ` · ${t('{n} mins', { n: s.durationMinutes })}` : ''}
                        </Small>
                      </View>
                      {s.description ? <Small>{s.description}</Small> : null}
                    </View>
                    <View style={{ justifyContent: 'center' }}>
                      <QtyStepper
                        label={name}
                        qty={inCart ? cart.qty(s.id) : 0}
                        onChange={(delta) => cartStore.change(category, s, delta)}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          ))}

          <View
            style={{
              flexDirection: 'row',
              gap: spacing[3],
              alignItems: 'center',
              padding: spacing[4],
              borderRadius: 18,
              backgroundColor: c.surfaceMuted,
            }}
          >
            <Ionicons name="chatbubbles" size={22} color={c.primary} />
            <View style={{ flex: 1 }}>
              <Small muted={false}>{t("Can't find your problem?")}</Small>
              <Small>{t('Describe it and compare quotes from verified professionals.')}</Small>
            </View>
          </View>
          <Button
            title={t('Describe the work instead')}
            kind="outline"
            icon="create"
            onPress={() =>
              router.push({ pathname: '/requirement/new', params: { type: 'service', category } })
            }
          />
        </View>
      </ScrollView>
      {inCart && cart.count > 0 ? (
        <CartBar
          testID="cart-continue"
          count={cart.count}
          totalPaise={cart.totalPaise}
          action={t('Continue')}
          onPress={() => router.push('/book/checkout')}
        />
      ) : null}
    </SafeAreaView>
  );
}
