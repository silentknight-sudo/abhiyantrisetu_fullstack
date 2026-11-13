import Ionicons from '@expo/vector-icons/Ionicons';
import { SECTORS } from '@setu/domain';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Loading,
  Screen,
  Small,
  TrustRow,
} from '@/components/ui';
import { $api } from '@/lib/api';
import { type MessageKey, useI18n } from '@/lib/i18n';
import { secureStorage } from '@/lib/storage';
import { font, shadow, spacing, typeScale, usePalette } from '@/lib/theme';

const ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  architect: 'compass-outline',
  'interior-designer': 'color-palette-outline',
  'civil-engineer': 'construct-outline',
  'structural-engineer': 'git-network-outline',
  'vastu-consultant': 'sunny-outline',
};
const WHAT: Record<string, MessageKey> = {
  architect: 'House design, elevation, approval drawings',
  'interior-designer': 'Full home interiors, modular kitchen, 3D',
  'civil-engineer': 'Estimates, supervision, quality checks',
  'structural-engineer': 'Structure design, extra-floor safety',
  'vastu-consultant': 'Plot, plan and home Vastu review',
};

/** Find a Professional: pick a profession, shortlist verified professionals, request proposals. */
export default function Professionals() {
  const { t, locale } = useI18n();
  const c = usePalette();
  const catalog = $api.useQuery('get', '/v1/catalog/categories');
  const professions = (catalog.data ?? []).filter((x) => x.requirementType === 'consult');
  const [slug, setSlug] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [sectorName, setSectorName] = useState<string>(SECTORS[0]!.name);
  useEffect(() => {
    void secureStorage.get('setu.sector').then((v) => v && setSectorName(v));
  }, []);
  const at = SECTORS.find((s) => s.name === sectorName) ?? SECTORS[0]!;
  const pros = $api.useQuery(
    'get',
    '/v1/catalog/pros',
    { params: { query: { category: slug ?? '', lat: at.lat, lng: at.lng } } },
    { enabled: Boolean(slug) },
  );
  const toggle = (id: string) =>
    setPicked(
      picked.includes(id)
        ? picked.filter((x) => x !== id)
        : picked.length < 5
          ? [...picked, id]
          : picked,
    );

  return (
    <Screen>
      <Stack.Screen options={{ title: t('Find a professional') }} />
      <TrustRow
        items={[
          ['ribbon-outline', t('Licence or degree checked')],
          ['images-outline', t('Real portfolio')],
          ['wallet-outline', t('Pay per deliverable')],
        ]}
      />
      <Text style={[typeScale.lg, { color: c.text, fontFamily: font.heading }]}>
        {t('Who do you need?')}
      </Text>
      {catalog.isPending ? <Loading /> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] }}>
        {professions.map((p) => {
          const on = slug === p.slug;
          return (
            <Pressable
              key={p.slug}
              testID={`profession-${p.slug}`}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => {
                setSlug(p.slug);
                setPicked([]);
              }}
              style={[
                shadow,
                {
                  width: '47%',
                  flexGrow: 1,
                  padding: spacing[3],
                  borderRadius: 18,
                  gap: 6,
                  borderWidth: on ? 1.5 : 1,
                  borderColor: on ? c.highlight : c.border,
                  backgroundColor: on ? c.highlightBg : c.surface,
                },
              ]}
            >
              <Ionicons name={ICONS[p.slug] ?? 'person-outline'} size={24} color={c.text} />
              <Text style={[typeScale.base, { color: c.text, fontFamily: font.heading }]}>
                {locale === 'hi' ? p.nameHi : p.nameEn}
              </Text>
              {WHAT[p.slug] ? <Small>{t(WHAT[p.slug]!)}</Small> : null}
            </Pressable>
          );
        })}
      </View>

      {slug ? (
        <>
          <Text style={[typeScale.lg, { color: c.text, fontFamily: font.heading }]}>
            {t('Near {area}', { area: at.name })}
          </Text>
          {pros.isPending ? <Loading /> : null}
          {pros.data && pros.data.length === 0 ? (
            <Empty
              icon="people-outline"
              title={t('No verified professional here yet')}
              body={t(
                'Post your brief anyway: Setu brings in professionals and tells you when proposals arrive.',
              )}
            />
          ) : null}
          {pros.data?.map((p, i) => {
            const on = picked.includes(p.id);
            return (
              <Card key={p.id} accent={on ? c.highlight : undefined}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                  <Avatar name={p.displayName} size={46} />
                  <View style={{ flex: 1 }}>
                    <Text style={[typeScale.base, { color: c.text, fontFamily: font.heading }]}>
                      {p.displayName}
                    </Text>
                    <Small>
                      {p.ratingCount
                        ? `★ ${Number(p.ratingAvg).toFixed(1)} (${p.ratingCount})`
                        : t('No reviews yet')}
                      {` · ${t('{n} jobs', { n: p.jobsDone })} · ~${p.distanceKm} km`}
                    </Small>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' }}>
                  <Badge label={`✓ ${t('Verified')}`} tone="success" />
                  {p.gstRegistered ? <Badge label="✓ GST" tone="success" /> : null}
                  {p.ratingCount === 0 ? <Badge label={t('New on Setu')} tone="info" /> : null}
                </View>
                <Button
                  testID={`shortlist-${i}`}
                  title={on ? `✓ ${t('Shortlisted')}` : t('+ Shortlist')}
                  kind={on ? 'primary' : 'outline'}
                  onPress={() => toggle(p.id)}
                />
              </Card>
            );
          })}
          <Button
            testID="request-proposals"
            title={
              picked.length
                ? t('Request proposals from {n}', { n: picked.length })
                : t('Request proposals from Setu matches')
            }
            kind="accent"
            onPress={() =>
              router.push({
                pathname: '/requirement/new',
                params: { type: 'consult', category: slug, partners: picked.join(',') },
              })
            }
          />
          <Small>
            {t(
              'Fees are starting points. Each professional sends a proposal; you pay per deliverable.',
            )}
          </Small>
        </>
      ) : null}
    </Screen>
  );
}
