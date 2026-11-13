import { SECTORS } from '@setu/domain';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import {
  Badge,
  Card,
  Chip,
  Chips,
  Empty,
  Loading,
  Notice,
  Row,
  Screen,
  Small,
} from '@/components/ui';
import { $api } from '@/lib/api';
import { BOOKABLE } from '@/lib/cart';
import { errorMessage } from '@/lib/errors';
import { ago } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { font, spacing, typeScale, usePalette } from '@/lib/theme';

/** Ratings and reviews for a category: star breakdown and filterable reviews. */
export default function CategoryReviews() {
  const { t } = useI18n();
  const c = usePalette();
  const { category, sector } = useLocalSearchParams<{ category: string; sector?: string }>();
  const [filter, setFilter] = useState<'recent' | 'detailed' | 'area'>('recent');
  const area = sector ?? SECTORS[0]!.name;
  const data = $api.useQuery('get', '/v1/catalog/reviews', {
    params: {
      query: {
        category,
        ...(filter === 'detailed' ? { sort: 'detailed' as const } : {}),
        ...(filter === 'area' ? { sector: area } : {}),
      },
    },
  });
  const r = data.data;

  return (
    <Screen>
      <Stack.Screen options={{ title: t(BOOKABLE[category] ?? 'Reviews') }} />
      {data.isPending ? <Loading /> : null}
      {data.error ? <Notice>{errorMessage(data.error)}</Notice> : null}
      {r ? (
        <Card>
          <Text style={[typeScale['3xl'], { color: c.text, fontFamily: font.headingHeavy }]}>
            ★ {r.average != null ? r.average.toFixed(2) : '–'}
          </Text>
          <Small>{t('{n} reviews', { n: r.total })}</Small>
          {r.stars.map((n, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
              <Small muted={false}>★ {5 - i}</Small>
              <View
                style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: c.surfaceMuted }}
              >
                <View
                  style={{
                    height: 6,
                    borderRadius: 3,
                    width: `${r.total ? (n / r.total) * 100 : 0}%`,
                    backgroundColor: c.highlight,
                  }}
                />
              </View>
              <Small>{r.total ? `${Math.round((n / r.total) * 100)}%` : '0%'}</Small>
            </View>
          ))}
          <Small>{t('Only customers with a completed booking can review.')}</Small>
        </Card>
      ) : null}
      <Chips>
        <Chip
          label={t('Most recent')}
          selected={filter === 'recent'}
          onPress={() => setFilter('recent')}
        />
        <Chip
          label={t('Most detailed')}
          selected={filter === 'detailed'}
          onPress={() => setFilter('detailed')}
        />
        <Chip
          label={t('In my area')}
          selected={filter === 'area'}
          onPress={() => setFilter('area')}
        />
      </Chips>
      {r && r.reviews.length === 0 ? (
        <Empty
          icon="star-outline"
          title={t('No reviews yet')}
          body={t('Reviews appear here after completed bookings.')}
        />
      ) : null}
      {r?.reviews.map((v) => (
        <Card key={v.id}>
          <Row>
            <Text style={[typeScale.base, { color: c.text, fontFamily: font.heading }]}>
              {v.customerFirstName ?? t('Customer')}
            </Text>
            <Badge
              label={`★ ${v.rating}`}
              tone={v.rating >= 4 ? 'success' : v.rating === 3 ? 'warning' : 'danger'}
            />
          </Row>
          <Small>
            {ago(v.createdAt, t)} · {v.serviceTitle}
            {v.sector ? ` · ${v.sector}` : ''}
          </Small>
          {v.comment ? (
            <Text style={[typeScale.base, { color: c.text, fontFamily: font.body }]}>
              {v.comment}
            </Text>
          ) : null}
          <Small>{t('Professional: {name}', { name: v.partnerName })}</Small>
          {v.partnerReply ? <Small muted={false}>↳ {v.partnerReply}</Small> : null}
        </Card>
      ))}
    </Screen>
  );
}
