import { SECTORS } from '@setu/domain';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  Chip,
  Chips,
  Field,
  Loading,
  Notice,
  Row,
  Screen,
  Small,
  Title,
} from '@/components/ui';
import { $api, client, queryClient } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { rupees } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { font, spacing, typeScale, usePalette } from '@/lib/theme';

const day = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/** Care plans (AMC): set it once; Setu books the visits through the year. */
export default function CarePlans() {
  const { t } = useI18n();
  const c = usePalette();
  const plans = $api.useQuery('get', '/v1/catalog/care-plans');
  const mine = $api.useQuery('get', '/v1/care-plans');
  const [picking, setPicking] = useState<string | null>(null);
  const [sector, setSector] = useState<(typeof SECTORS)[number]>(SECTORS[0]!);
  const [line1, setLine1] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = (mine.data ?? []).filter((s) => s.status === 'active');

  async function subscribe(planKey: string) {
    setBusy(true);
    setError(null);
    const res = await client.api.POST('/v1/care-plans', {
      body: {
        planKey,
        address: {
          line1,
          sector: sector.name,
          city: 'Greater Noida',
          pincode: sector.pincode,
          location: { lat: sector.lat, lng: sector.lng },
        },
      },
    });
    setBusy(false);
    if (res.error) return setError(errorMessage(res.error));
    setPicking(null);
    void queryClient.invalidateQueries({ queryKey: ['get', '/v1/care-plans'] });
  }
  async function cancel(id: string) {
    const res = await client.api.POST('/v1/care-plans/{id}/cancel', { params: { path: { id } } });
    if (res.error) return setError(errorMessage(res.error));
    void queryClient.invalidateQueries({ queryKey: ['get', '/v1/care-plans'] });
  }

  return (
    <Screen refreshing={mine.isRefetching} onRefresh={() => void mine.refetch()}>
      <Stack.Screen options={{ title: t('Care plans') }} />
      <View style={{ borderRadius: 22, backgroundColor: '#0F1E3D', padding: spacing[5], gap: 4 }}>
        <Text style={[typeScale.xl, { color: '#fff', fontFamily: font.headingHeavy }]}>
          {t('Set it once. Setu books the visits.')}
        </Text>
        <Text style={[typeScale.sm, { color: 'rgba(255,255,255,0.8)', fontFamily: font.body }]}>
          {t(
            'The same verified professional each time where possible. Reminders on WhatsApp before every visit.',
          )}
        </Text>
      </View>
      {active.length ? <Title>{t('Your plans')}</Title> : null}
      {active.map((s) => (
        <Card key={s.id}>
          <Row>
            <Title>{s.planName}</Title>
            <Badge label={t('Active')} tone="success" />
          </Row>
          <Small>
            {s.nextVisit
              ? t('Next visit: {date}', { date: day(s.nextVisit) })
              : t('All visits done this year')}
          </Small>
          <Small>{t('Visits: {dates}', { dates: s.visits.map(day).join(', ') })}</Small>
          <Button title={t('Cancel plan')} kind="outline" onPress={() => void cancel(s.id)} />
        </Card>
      ))}
      {error ? <Notice>{error}</Notice> : null}
      {plans.isPending ? <Loading /> : null}
      {plans.data?.map((p) => {
        const has = active.some((s) => s.planKey === p.key);
        return (
          <Card key={p.key}>
            <Row>
              <Text style={[typeScale.lg, { color: c.text, fontFamily: font.heading }]}>
                {p.name}
              </Text>
              <Text style={[typeScale.base, { color: c.text, fontFamily: font.heading }]}>
                {t('{amount} /yr', { amount: rupees(p.pricePaise) })}
              </Text>
            </Row>
            {p.includes.map((x) => (
              <Small key={x}>• {x}</Small>
            ))}
            <Small muted={false}>{t('{n} visits a year', { n: p.visitsPerYear })}</Small>
            {picking === p.key ? (
              <View style={{ gap: spacing[2] }}>
                <Chips>
                  {SECTORS.map((s) => (
                    <Chip
                      key={s.slug}
                      label={s.name}
                      selected={sector.slug === s.slug}
                      onPress={() => setSector(s)}
                    />
                  ))}
                </Chips>
                <Field
                  label={t('Flat, tower and society')}
                  value={line1}
                  onChangeText={setLine1}
                  testID="care-line1"
                />
                <Button
                  title={t('Confirm plan')}
                  loading={busy}
                  disabled={line1.trim().length < 3}
                  onPress={() => void subscribe(p.key)}
                />
                <Small>{t('Pay at the first visit, by UPI or card.')}</Small>
              </View>
            ) : (
              <Button
                testID={`subscribe-${p.key}`}
                title={has ? t('Subscribed') : t('Subscribe')}
                kind={has ? 'outline' : 'primary'}
                disabled={has}
                onPress={() => setPicking(p.key)}
              />
            )}
          </Card>
        );
      })}
    </Screen>
  );
}
