import { constructionEstimate, formatINR, paintingEstimate } from '@setu/domain';
import { Pressable, Text, View } from 'react-native';
import { Avatar, Card, Small, Title } from './ui';
import { $api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { font, spacing, typeScale, usePalette } from '@/lib/theme';

const inr = (p: number) => formatINR(p, { decimals: false });

/** Live cost range for the answers so far (painting and construction), standard finish. */
export function CostRange({ slug, areaSqft }: { slug?: string; areaSqft: number }) {
  const { t } = useI18n();
  const c = usePalette();
  if (!slug || areaSqft < 50) return null;
  const e =
    slug === 'painting'
      ? paintingEstimate(areaSqft, 'standard')
      : slug === 'house-construction'
        ? constructionEstimate(areaSqft, 1, 'standard')
        : null;
  if (!e) return null;
  return (
    <View style={{ borderRadius: 18, backgroundColor: '#0F1E3D', padding: spacing[4], gap: 4 }}>
      <Text
        style={[
          typeScale.xs,
          { color: c.highlight, fontFamily: font.semibold, letterSpacing: 1.2 },
        ]}
      >
        {t('Typical cost for your answers').toUpperCase()}
      </Text>
      <Text
        testID="cost-range"
        style={[typeScale['2xl'], { color: '#fff', fontFamily: font.headingHeavy }]}
      >
        {inr(e.lowPaise)} – {inr(e.highPaise)}
      </Text>
      <Text style={[typeScale.xs, { color: 'rgba(255,255,255,0.7)', fontFamily: font.body }]}>
        {t('Standard finish, Greater Noida rates. Real quotes may differ after a site visit.')}
      </Text>
    </View>
  );
}

/** Optional: pick up to five verified professionals to quote, compared side by side. */
export function ChooseWhoQuotes({
  slug,
  at,
  selected,
  onChange,
}: {
  slug?: string;
  at: { lat: number; lng: number };
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const { t } = useI18n();
  const c = usePalette();
  const pros = $api.useQuery(
    'get',
    '/v1/catalog/pros',
    { params: { query: { category: slug ?? '', lat: at.lat, lng: at.lng } } },
    { enabled: Boolean(slug) },
  );
  if (!slug || !pros.data?.length) return null;
  const toggle = (id: string) =>
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : selected.length < 5
          ? [...selected, id]
          : selected,
    );
  return (
    <Card>
      <Title>{t('Choose who quotes (optional)')}</Title>
      <Small>
        {selected.length
          ? t('{n} selected · only they get your request', { n: selected.length })
          : t('Pick up to 5, or leave it to Setu to match the best nearby.')}
      </Small>
      {pros.data.map((p, i) => {
        const on = selected.includes(p.id);
        return (
          <Pressable
            key={p.id}
            testID={`pick-pro-${i}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            onPress={() => toggle(p.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[3],
              padding: spacing[3],
              borderRadius: 14,
              borderWidth: on ? 1.5 : 1,
              borderColor: on ? c.highlight : c.border,
              backgroundColor: on ? c.highlightBg : c.surface,
            }}
          >
            <Avatar name={p.displayName} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={[typeScale.base, { color: c.text, fontFamily: font.semibold }]}>
                {p.displayName}
              </Text>
              <Small>
                {p.ratingCount
                  ? `★ ${Number(p.ratingAvg).toFixed(1)} (${p.ratingCount})`
                  : t('New on Setu')}
                {` · ${t('{n} jobs', { n: p.jobsDone })} · ~${p.distanceKm} km`}
                {p.gstRegistered ? ' · GST' : ''}
              </Small>
            </View>
            <Text style={[typeScale.lg, { color: on ? c.text : c.textMuted }]}>
              {on ? '☑' : '☐'}
            </Text>
          </Pressable>
        );
      })}
    </Card>
  );
}
