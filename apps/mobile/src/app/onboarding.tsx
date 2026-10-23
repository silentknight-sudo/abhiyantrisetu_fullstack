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
import { tradeLabel } from '@/lib/format';

const RADII = [5, 10, 15, 25];
type Trade = (typeof TRADES)[number];

/** Partner business profile: create on first launch, edit later from Account. */
export default function Onboarding() {
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
    setTrades(p.trades.filter((t): t is Trade => (TRADES as readonly string[]).includes(t)));
    setRadius(p.serviceRadiusKm);
    setGstin(p.gstin ?? '');
    if (p.baseLocation) setBase({ ...p.baseLocation, label: 'Saved location' });
  }, [existing.data]);

  async function useGps() {
    setError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted')
        throw new Error('Location permission was not given. Pick your sector instead.');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setBase({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Current location' });
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
          ? 'Pick where you work from'
          : (issue?.message ?? 'Check the form'),
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
          <Heading>Set up your business</Heading>
          <Body muted>
            Customers see your name, trades and rating. We verify your documents before leads start.
          </Body>
        </>
      ) : null}
      <Field
        label="Name customers will see"
        testID="display-name"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="e.g. Ramesh Plumbing Works"
      />
      <Field
        label="Registered business name (optional)"
        value={businessName}
        onChangeText={setBusinessName}
      />
      <Card>
        <Title>Your trades</Title>
        <Chips>
          {TRADES.map((t) => (
            <Chip
              key={t}
              label={tradeLabel(t)}
              selected={trades.includes(t)}
              onPress={() =>
                setTrades(trades.includes(t) ? trades.filter((x) => x !== t) : [...trades, t])
              }
            />
          ))}
        </Chips>
        <Small>Pick up to 6.</Small>
      </Card>
      <Card>
        <Title>Where do you work from?</Title>
        <Button title="Use my current location" kind="outline" onPress={useGps} />
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
        {base ? <Small>Selected: {base.label}</Small> : null}
        <Title>How far will you travel?</Title>
        <Chips>
          {RADII.map((r) => (
            <Chip key={r} label={`${r} km`} selected={radius === r} onPress={() => setRadius(r)} />
          ))}
        </Chips>
      </Card>
      <Field
        label="GSTIN (optional)"
        value={gstin}
        onChangeText={setGstin}
        autoCapitalize="characters"
        maxLength={15}
        hint="Add it to send GST invoices; customers see a GST badge on your quotes."
      />
      {error ? <Notice>{error}</Notice> : null}
      <Button
        title={existing.data ? 'Save' : 'Continue'}
        kind="accent"
        testID="save-profile"
        loading={busy}
        onPress={save}
      />
    </Screen>
  );
}
