import { useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { Milestones } from './Milestones';
import { PhotoPicker } from './PhotoPicker';
import { Badge, Button, Card, Chip, Chips, Field, Notice, Row, Small, Title } from './ui';
import { $api, client, queryClient } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { rupees } from '@/lib/format';
import { type MessageKey, useI18n } from '@/lib/i18n';
import { font, spacing, typeScale, usePalette } from '@/lib/theme';

/** Common parts with fixed prices, by trade (sample rate card; ₹). */
const RATE_CARD: Record<string, [MessageKey, number][]> = {
  plumber: [
    ['Tap cartridge', 180],
    ['Angle valve', 240],
    ['Flexible connection pipe', 120],
    ['Waste pipe (1 m)', 150],
  ],
  electrician: [
    ['Switch or socket', 60],
    ['MCB', 350],
    ['Fan capacitor', 120],
    ['Wire (per metre)', 25],
  ],
  carpenter: [
    ['Door hinge', 90],
    ['Drawer channel', 220],
    ['Door lock', 450],
  ],
  'ac-technician': [
    ['Copper pipe (per foot)', 180],
    ['AC capacitor', 450],
    ['Drain pipe', 150],
  ],
};
const LABOUR: [MessageKey, number] = ['Extra labour (30 min)', 149];

type Work = {
  milestones: Parameters<typeof Milestones>[0]['milestones'];
  paidPaise: number;
  extras: {
    id: string;
    description: string;
    amountPaise: number;
    status: 'pending' | 'approved' | 'declined';
  }[];
  photos: { before: string[]; after: string[] };
  totalPaise: number;
};

/**
 * On-site work for a job: extras the partner adds (the customer approves each, which
 * raises the amount due) and before/after photos.
 */
export function JobWork({
  jobId,
  viewer,
  state,
  trades,
}: {
  jobId: string;
  viewer: string;
  state: string;
  trades: string[];
}) {
  const { t } = useI18n();
  const c = usePalette();
  const path = { params: { path: { id: jobId } } };
  const work = $api.useQuery('get', '/v1/jobs/{id}/work', path);
  const [adding, setAdding] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<'before' | 'after' | null>(null);
  const [keys, setKeys] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const isPartner = viewer === 'partner';
  const isCustomer = viewer === 'customer';
  const w = work.data as Work | undefined;
  if (!w) return null;

  async function run(call: () => Promise<{ error?: unknown }>) {
    setBusy(true);
    setError(null);
    const res = await call();
    setBusy(false);
    if (res.error) {
      setError(errorMessage(res.error));
      return false;
    }
    await queryClient.invalidateQueries({ queryKey: ['get', '/v1/jobs/{id}/work'] });
    await queryClient.invalidateQueries({ queryKey: ['get', '/v1/jobs/{id}/payments'] });
    await queryClient.invalidateQueries({ queryKey: ['get', '/v1/jobs/{id}'] });
    return true;
  }
  const addExtra = (description: string, rupeesValue: number) =>
    run(() =>
      client.api.POST('/v1/jobs/{id}/extras', {
        ...path,
        body: { description, amountPaise: Math.round(rupeesValue * 100) },
      }),
    ).then((ok) => {
      if (ok) {
        setAdding(false);
        setDesc('');
        setAmount('');
      }
    });
  const decide = (extraId: string, approve: boolean) =>
    run(() =>
      client.api.POST(
        approve
          ? '/v1/jobs/{id}/extras/{extraId}/approve'
          : '/v1/jobs/{id}/extras/{extraId}/decline',
        { params: { path: { id: jobId, extraId } } },
      ),
    );
  const savePhotos = () =>
    run(() =>
      client.api.POST('/v1/jobs/{id}/photos', { ...path, body: { kind: kind!, fileKeys: keys } }),
    ).then((ok) => {
      if (ok) {
        setKind(null);
        setKeys([]);
      }
    });

  const canAddExtra = isPartner && state === 'in_progress';
  const canBefore = isPartner && ['scheduled', 'in_progress'].includes(state);
  const canAfter = isPartner && ['in_progress', 'completed'].includes(state);
  const showExtras = w.extras.length > 0 || canAddExtra;
  const showPhotos = w.photos.before.length + w.photos.after.length > 0 || canBefore || canAfter;
  const card = RATE_CARD[trades[0] ?? ''] ?? [];

  return (
    <>
      <Milestones
        jobId={jobId}
        viewer={viewer}
        state={state}
        milestones={w.milestones}
        paidPaise={w.paidPaise}
      />
      {showExtras ? (
        <Card>
          <Row>
            <Title>{t('Parts & extra work')}</Title>
            <Text style={[typeScale.base, { color: c.text, fontFamily: font.heading }]}>
              {t('Total {amount}', { amount: rupees(w.totalPaise) })}
            </Text>
          </Row>
          {w.extras.length === 0 ? (
            <Small>
              {t('Add any part or extra work here. The customer approves each one in the app.')}
            </Small>
          ) : null}
          {w.extras.map((e) => (
            <View key={e.id} style={{ gap: spacing[2] }}>
              <Row>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      typeScale.base,
                      {
                        color: e.status === 'declined' ? c.textMuted : c.text,
                        fontFamily: font.medium,
                        textDecorationLine: e.status === 'declined' ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    {e.description}
                  </Text>
                  <Small>{rupees(e.amountPaise)}</Small>
                </View>
                <Badge
                  label={
                    e.status === 'approved'
                      ? t('Approved')
                      : e.status === 'declined'
                        ? t('Declined')
                        : t('Waiting for customer')
                  }
                  tone={
                    e.status === 'approved'
                      ? 'success'
                      : e.status === 'declined'
                        ? 'danger'
                        : 'warning'
                  }
                />
              </Row>
              {isCustomer && e.status === 'pending' ? (
                <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      testID={`decline-extra-${e.id}`}
                      title={t('Decline')}
                      kind="outline"
                      disabled={busy}
                      onPress={() => void decide(e.id, false)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      testID={`approve-extra-${e.id}`}
                      title={t('Approve {amount}', { amount: rupees(e.amountPaise) })}
                      loading={busy}
                      onPress={() => void decide(e.id, true)}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          ))}
          {canAddExtra && !adding ? (
            <Button
              testID="add-extra"
              title={t('Add part or extra work')}
              kind="outline"
              icon="add"
              onPress={() => setAdding(true)}
            />
          ) : null}
          {adding ? (
            <View style={{ gap: spacing[3] }}>
              <Small muted={false}>{t('From your rate card')}</Small>
              <Chips>
                {[...card, LABOUR].map(([name, price]) => (
                  <Chip
                    key={name}
                    label={`${t(name)} · ₹${price}`}
                    onPress={() => void addExtra(t(name), price)}
                  />
                ))}
              </Chips>
              <Small muted={false}>{t('Or add your own')}</Small>
              <Field
                label={t('What is it?')}
                value={desc}
                onChangeText={setDesc}
                testID="extra-desc"
              />
              <Field
                label={t('Price (₹)')}
                value={amount}
                onChangeText={setAmount}
                keyboardType="number-pad"
                testID="extra-amount"
              />
              <Button
                title={t('Send to customer')}
                loading={busy}
                disabled={desc.trim().length < 3 || !(Number(amount) >= 1)}
                onPress={() => void addExtra(desc.trim(), Number(amount))}
              />
              <Button title={t('Cancel')} kind="outline" onPress={() => setAdding(false)} />
            </View>
          ) : null}
        </Card>
      ) : null}

      {showPhotos ? (
        <Card>
          <Title>{t('Site photos')}</Title>
          {(['before', 'after'] as const).map((k) =>
            w.photos[k].length ? (
              <View key={k} style={{ gap: spacing[2] }}>
                <Small muted={false}>{k === 'before' ? t('Before') : t('After')}</Small>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                    {w.photos[k].map((u) => (
                      <Image
                        key={u}
                        source={{ uri: u }}
                        accessibilityIgnoresInvertColors
                        style={{
                          width: 84,
                          height: 84,
                          borderRadius: 12,
                          backgroundColor: c.surfaceMuted,
                        }}
                      />
                    ))}
                  </View>
                </ScrollView>
              </View>
            ) : null,
          )}
          {isPartner && !kind ? (
            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              {canBefore ? (
                <View style={{ flex: 1 }}>
                  <Button
                    title={t('+ Before photos')}
                    kind="outline"
                    onPress={() => setKind('before')}
                  />
                </View>
              ) : null}
              {canAfter ? (
                <View style={{ flex: 1 }}>
                  <Button
                    title={t('+ After photos')}
                    kind="outline"
                    onPress={() => setKind('after')}
                  />
                </View>
              ) : null}
            </View>
          ) : null}
          {kind ? (
            <View style={{ gap: spacing[3] }}>
              <PhotoPicker
                max={6}
                purpose="job_photo"
                onChange={(k, up) => {
                  setKeys(k);
                  setUploading(up);
                }}
              />
              <Button
                title={kind === 'before' ? t('Save before photos') : t('Save after photos')}
                loading={busy || uploading}
                disabled={keys.length === 0}
                onPress={() => void savePhotos()}
              />
              <Button title={t('Cancel')} kind="outline" onPress={() => setKind(null)} />
            </View>
          ) : null}
          {isCustomer && w.photos.before.length + w.photos.after.length === 0 ? (
            <Small>{t('Your professional adds photos before and after the work.')}</Small>
          ) : null}
        </Card>
      ) : null}
      {error ? <Notice>{error}</Notice> : null}
    </>
  );
}
