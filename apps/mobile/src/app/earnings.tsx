import { router } from 'expo-router';
import { Text, View } from 'react-native';
import {
  Card,
  Empty,
  IconBadge,
  Loading,
  Notice,
  Row,
  Screen,
  Section,
  Small,
  Title,
} from '@/components/ui';
import { $api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { rupees, when } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { font, shadow, spacing, typeScale, usePalette } from '@/lib/theme';

/** Partner earnings: what is owed, what was paid out, and every entry from the ledger. */
export default function Earnings() {
  const { t } = useI18n();
  const c = usePalette();
  const data = $api.useQuery('get', '/v1/partner/earnings');
  if (data.isPending) return <Loading />;
  if (data.error || !data.data)
    return (
      <Screen>
        <Notice>{errorMessage(data.error)}</Notice>
      </Screen>
    );
  const e = data.data;
  // Earnings per day for the last 7 days (payouts excluded).
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    const total = e.entries
      .filter(
        (x) => x.kind === 'earning' && new Date(x.createdAt).toDateString() === d.toDateString(),
      )
      .reduce((s, x) => s + x.amountPaise, 0);
    return { label: d.toLocaleDateString('en-IN', { weekday: 'short' }), total };
  });
  const peak = Math.max(1, ...days.map((d) => d.total));

  return (
    <Screen refreshing={data.isRefetching} onRefresh={() => void data.refetch()}>
      <View
        style={{
          borderRadius: 24,
          backgroundColor: c.primary,
          padding: spacing[5],
          gap: spacing[2],
        }}
      >
        <Text
          style={[
            typeScale.xs,
            { color: c.highlight, fontFamily: font.semibold, letterSpacing: 1.4 },
          ]}
        >
          {t('Next payout').toUpperCase()}
        </Text>
        <Text style={[typeScale['4xl'], { color: '#fff', fontFamily: font.headingHeavy }]}>
          {rupees(e.owedPaise)}
        </Text>
        <Text style={[typeScale.sm, { color: 'rgba(255,255,255,0.8)', fontFamily: font.body }]}>
          {t('Paid to your bank every week once customers confirm the work.')}
        </Text>
        <View
          accessibilityRole="image"
          accessibilityLabel={t('Daily earnings, last 7 days')}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 6,
            height: 84,
            marginTop: spacing[2],
          }}
        >
          {days.map((d, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                alignItems: 'center',
                gap: 4,
                height: '100%',
                justifyContent: 'flex-end',
              }}
            >
              <View
                style={{
                  width: '100%',
                  height: Math.max(4, (d.total / peak) * 60),
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  backgroundColor: i === 6 ? c.highlight : 'rgba(255,255,255,0.28)',
                }}
              />
              <Text
                style={[typeScale.xs, { color: 'rgba(255,255,255,0.7)', fontFamily: font.body }]}
              >
                {d.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing[3] }}>
        {(
          [
            ['This week', e.thisWeekPaise],
            ['Total earned', e.earnedPaise],
            ['Paid out', e.paidOutPaise],
          ] as const
        ).map(([label, v]) => (
          <View
            key={label}
            style={[
              shadow,
              {
                flex: 1,
                borderRadius: 18,
                padding: spacing[3],
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.border,
                gap: 2,
              },
            ]}
          >
            <Small>{t(label)}</Small>
            <Text style={[typeScale.base, { color: c.text, fontFamily: font.heading }]}>
              {rupees(v)}
            </Text>
          </View>
        ))}
      </View>

      <Section title={t('History')} />
      {e.entries.length === 0 ? (
        <Empty
          icon="wallet-outline"
          title={t('No earnings yet')}
          body={t('Money from completed jobs appears here once the customer confirms.')}
        />
      ) : null}
      {e.entries.map((x) => (
        <Card key={x.id} onPress={x.jobId ? () => router.push(`/job/${x.jobId}`) : undefined}>
          <View style={{ flexDirection: 'row', gap: spacing[3], alignItems: 'center' }}>
            <IconBadge
              name={x.kind === 'payout' ? 'arrow-up' : 'arrow-down'}
              tone={x.kind === 'payout' ? 'light' : 'orange'}
              size={40}
            />
            <View style={{ flex: 1 }}>
              <Title>
                {x.kind === 'payout' ? t('Payout to bank') : (x.jobTitle ?? t('Job payment'))}
              </Title>
              <Small>
                {when(x.createdAt)}
                {x.reference ? ` · ${x.reference}` : ''}
              </Small>
            </View>
            <Row>
              <Text
                style={[
                  typeScale.base,
                  { fontFamily: font.heading, color: x.kind === 'payout' ? c.text : c.success },
                ]}
              >
                {x.kind === 'payout' ? '−' : '+'}
                {rupees(x.amountPaise)}
              </Text>
            </Row>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
