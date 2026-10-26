import { SECTORS, TRADES } from '@setu/domain';
import { partnerProfileSchema } from '@setu/schemas';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Body,
  Button,
  Card,
  Chip,
  Chips,
  Field,
  Heading,
  Notice,
  Screen,
  Small,
  Title,
} from '@/components/ui';
import { $api, client, queryClient } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { tradeName } from '@/lib/format';
import { useI18n } from '@/lib/i18n';

const RADII = [5, 10, 15, 25];
type Trade = (typeof TRADES)[number];

/** Partner business profile: create on first launch, edit later from Account. */
export default function Onboarding() {
  const { t } = useI18n();
  const existing = $api.useQuery('get', '/v1/partners/me', {}, { retry: false });
  const [displayName, setDisplayName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [radius, setRadius] = useState(10);
  const [gstin, setGstin] = useState('');
  const [base, setBase] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = existing.data;
    if (!p) return;
    setDisplayName(p.displayName);
    setBusinessName(p.businessName ?? '');
    setTrades(p.trades.filter((s): s is Trade => (TRADES as readonly string[]).includes(s)));
    setRadius(p.serviceRadiusKm);
    setGstin(p.gstin ?? '');
    if (p.baseLocation) setBase({ ...p.baseLocation, label: t('Saved location') });
  }, [existing.data, t]);

  async function useGps() {
    setError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted')
        throw new Error(t('Location permission was not given. Pick your sector instead.'));
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setBase({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        label: t('Current location'),
      });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function save() {
    setError(null);
    const parsed = partnerProfileSchema.safeParse({
      displayName,
      businessName: businessName.trim() || undefined,
      trades,
      serviceRadiusKm: radius,
      gstin: gstin.trim() || undefined,
      baseLocation: base ? { lat: base.lat, lng: base.lng } : undefined,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return setError(
        issue?.path[0] === 'baseLocation'
          ? t('Pick where you work from')
          : (issue?.message ?? t('Check the form')),
      );
    }
    setBusy(true);
    try {
      const res = existing.data
        ? await client.api.PATCH('/v1/partners/me', { body: parsed.data })
        : await client.api.POST('/v1/partners/me', { body: parsed.data });
      if (!res.data) throw res.error;
      await queryClient.invalidateQueries({ queryKey: ['get', '/v1/partners/me'] });
      if (router.canGoBack()) router.back();
      else router.replace('/leads');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      {!existing.data ? (
        <>
          <Heading>{t('Set up your business')}</Heading>
          <Body muted>
            {t(
              'Customers see your name, trades and rating. We verify your documents before leads start.',
            )}
          </Body>
        </>
      ) : null}
      <Field
        label={t('Name customers will see')}
        testID="display-name"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder={t('e.g. Ramesh Plumbing Works')}
      />
      <Field
        label={t('Registered business name (optional)')}
        value={businessName}
        onChangeText={setBusinessName}
      />
      <Card>
        <Title>{t('Your trades')}</Title>
        <Chips>
          {TRADES.map((slug) => (
            <Chip
              key={slug}
              label={tradeName(slug, t)}
              selected={trades.includes(slug)}
              onPress={() =>
                setTrades(
                  trades.includes(slug) ? trades.filter((x) => x !== slug) : [...trades, slug],
                )
              }
            />
          ))}
        </Chips>
        <Small>{t('Pick up to 6.')}</Small>
      </Card>
      <Card>
        <Title>{t('Where do you work from?')}</Title>
        <Button title={t('Use my current location')} kind="outline" onPress={useGps} />
        <Chips>
          {SECTORS.map((s) => (
            <Chip
              key={s.slug}
              label={s.name}
              selected={base?.label === s.name}
              onPress={() => setBase({ lat: s.lat, lng: s.lng, label: s.name })}
            />
          ))}
        </Chips>
        {base ? <Small>{t('Selected: {value}', { value: base.label })}</Small> : null}
        <Title>{t('How far will you travel?')}</Title>
        <Chips>
          {RADII.map((r) => (
            <Chip key={r} label={`${r} km`} selected={radius === r} onPress={() => setRadius(r)} />
          ))}
        </Chips>
      </Card>
      <Field
        label={t('GSTIN (optional)')}
        value={gstin}
        onChangeText={setGstin}
        autoCapitalize="characters"
        maxLength={15}
        hint={t('Add it to send GST invoices; customers see a GST badge on your quotes.')}
      />
      {error ? <Notice>{error}</Notice> : null}
      <Button
        title={existing.data ? t('Save') : t('Continue')}
        kind="accent"
        testID="save-profile"
        loading={busy}
        onPress={save}
      />
    </Screen>
  );
}
