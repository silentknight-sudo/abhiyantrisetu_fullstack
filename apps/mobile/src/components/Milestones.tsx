import { useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { PhotoPicker } from './PhotoPicker';
import { Badge, Button, Card, Field, Notice, Row, Small, Title } from './ui';
import { client, queryClient } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { rupees } from '@/lib/format';
import { type MessageKey, useI18n } from '@/lib/i18n';
import { useJobPayment } from '@/lib/payment';
import { font, spacing, typeScale, usePalette } from '@/lib/theme';

type Milestone = {
  id: string;
  seq: number;
  title: string;
  percent: number;
  amountPaise: number;
  status: 'pending' | 'ready' | 'changes_requested' | 'approved';
  photoUrls: string[];
  note: string | null;
  funded: boolean;
};

const STATUS: Record<
  Milestone['status'],
  [MessageKey, 'neutral' | 'warning' | 'danger' | 'success']
> = {
  pending: ['Not started', 'neutral'],
  ready: ['Ready for your approval', 'warning'],
  changes_requested: ['Fixes asked', 'danger'],
  approved: ['Approved', 'success'],
};

/**
 * A quoted project's payment stages. The partner marks each ready with photos; the
 * customer funds it into Setu Safe, then approves (releasing it) or asks for fixes.
 */
export function Milestones({
  jobId,
  viewer,
  state,
  milestones,
  paidPaise,
}: {
  jobId: string;
  viewer: string;
  state: string;
  milestones: Milestone[];
  paidPaise: number;
}) {
  const { t } = useI18n();
  const c = usePalette();
  const payment = useJobPayment(jobId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const [keys, setKeys] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState('');
  const [fixFor, setFixFor] = useState<string | null>(null);
  if (!milestones.length) return null;

  const isPartner = viewer === 'partner';
  const isCustomer = viewer === 'customer';
  const total = milestones.reduce((s, m) => s + m.amountPaise, 0);
  const released = milestones
    .filter((m) => m.status === 'approved')
    .reduce((s, m) => s + m.amountPaise, 0);
  const next = milestones.find((m) => m.status !== 'approved');

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
    return true;
  }
  const params = (milestoneId: string) => ({ params: { path: { id: jobId, milestoneId } } });

  return (
    <Card>
      <Title>{t('Milestones')}</Title>
      <View style={{ borderRadius: 16, backgroundColor: '#1E1B4F', padding: spacing[4], gap: 4 }}>
        <Text
          style={[
            typeScale.xs,
            { color: c.highlight, fontFamily: font.semibold, letterSpacing: 1.2 },
          ]}
        >
          {t('Setu Safe').toUpperCase()}
        </Text>
        <Text style={[typeScale['2xl'], { color: '#fff', fontFamily: font.headingHeavy }]}>
          {rupees(total)}
        </Text>
        <Text style={[typeScale.sm, { color: 'rgba(255,255,255,0.75)', fontFamily: font.body }]}>
          {t('Released {released} · in Setu Safe {held} · balance {balance}', {
            released: rupees(released),
            held: rupees(Math.max(0, paidPaise - released)),
            balance: rupees(Math.max(0, total - paidPaise)),
          })}
        </Text>
      </View>

      {milestones.map((m) => {
        const [label, tone] = STATUS[m.status];
        const isNext = next?.id === m.id;
        return (
          <View
            key={m.id}
            style={{
              gap: spacing[2],
              padding: spacing[3],
              borderRadius: 14,
              borderWidth: isNext ? 1.5 : 1,
              borderColor: isNext ? c.highlight : c.border,
            }}
          >
            <Row>
              <Text
                style={[
                  typeScale.xs,
                  { color: c.textMuted, fontFamily: font.semibold, letterSpacing: 1 },
                ]}
              >
                {t('MILESTONE {n} OF {total}', { n: m.seq, total: milestones.length })}
              </Text>
              <Badge label={t(label)} tone={tone} />
            </Row>
            <Text style={[typeScale.base, { color: c.text, fontFamily: font.heading }]}>
              {m.title}
            </Text>
            <Small>
              {t('{percent}% of contract · {amount}', {
                percent: m.percent,
                amount: rupees(m.amountPaise),
              })}
              {m.status !== 'approved' ? ` · ${m.funded ? t('Funded') : t('Not funded yet')}` : ''}
            </Small>
            {m.photoUrls.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                  {m.photoUrls.map((u) => (
                    <Image
                      key={u}
                      source={{ uri: u }}
                      accessibilityIgnoresInvertColors
                      style={{
                        width: 78,
                        height: 78,
                        borderRadius: 12,
                        backgroundColor: c.surfaceMuted,
                      }}
                    />
                  ))}
                </View>
              </ScrollView>
            ) : null}
            {m.note ? <Small muted={false}>“{m.note}”</Small> : null}

            {/* Customer: fund, approve, or ask for fixes */}
            {isCustomer && m.status !== 'approved' && !m.funded && isNext ? (
              <Button
                testID={`fund-${m.seq}`}
                title={t('Fund {amount}', { amount: rupees(m.amountPaise) })}
                kind="outline"
                loading={payment.busy}
                onPress={() =>
                  void payment.pay(Math.min(m.amountPaise, Math.max(100, total - paidPaise)))
                }
              />
            ) : null}
            {isCustomer && m.status === 'ready' && fixFor !== m.id ? (
              <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                <View style={{ flex: 1 }}>
                  <Button
                    title={t('Ask for fixes')}
                    kind="outline"
                    onPress={() => setFixFor(m.id)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    testID={`approve-${m.seq}`}
                    title={t('Approve milestone')}
                    loading={busy}
                    disabled={!m.funded}
                    onPress={() =>
                      void run(() =>
                        client.api.POST(
                          '/v1/jobs/{id}/milestones/{milestoneId}/approve',
                          params(m.id),
                        ),
                      )
                    }
                  />
                </View>
              </View>
            ) : null}
            {fixFor === m.id ? (
              <View style={{ gap: spacing[2] }}>
                <Field
                  label={t('What needs fixing?')}
                  value={note}
                  onChangeText={setNote}
                  multiline
                />
                <Button
                  title={t('Send to professional')}
                  loading={busy}
                  disabled={note.trim().length < 3}
                  onPress={() =>
                    void run(() =>
                      client.api.POST('/v1/jobs/{id}/milestones/{milestoneId}/changes', {
                        ...params(m.id),
                        body: { note: note.trim() },
                      }),
                    ).then((ok) => {
                      if (ok) {
                        setFixFor(null);
                        setNote('');
                      }
                    })
                  }
                />
                <Button title={t('Cancel')} kind="outline" onPress={() => setFixFor(null)} />
              </View>
            ) : null}

            {/* Partner: mark the next milestone ready with photos */}
            {isPartner &&
            isNext &&
            state === 'in_progress' &&
            ['pending', 'changes_requested'].includes(m.status) ? (
              readyFor === m.id ? (
                <View style={{ gap: spacing[2] }}>
                  <PhotoPicker
                    max={6}
                    purpose="job_photo"
                    onChange={(k, up) => {
                      setKeys(k);
                      setUploading(up);
                    }}
                  />
                  <Field
                    label={t('Note for the customer (optional)')}
                    value={note}
                    onChangeText={setNote}
                  />
                  <Button
                    title={t('Send for approval')}
                    loading={busy || uploading}
                    disabled={keys.length === 0}
                    onPress={() =>
                      void run(() =>
                        client.api.POST('/v1/jobs/{id}/milestones/{milestoneId}/ready', {
                          ...params(m.id),
                          body: { fileKeys: keys, ...(note.trim() ? { note: note.trim() } : {}) },
                        }),
                      ).then((ok) => {
                        if (ok) {
                          setReadyFor(null);
                          setNote('');
                          setKeys([]);
                        }
                      })
                    }
                  />
                  <Button title={t('Cancel')} kind="outline" onPress={() => setReadyFor(null)} />
                </View>
              ) : (
                <Button
                  testID={`ready-${m.seq}`}
                  title={t('Mark ready (add photos)')}
                  onPress={() => setReadyFor(m.id)}
                />
              )
            ) : null}
          </View>
        );
      })}
      <Small>
        {isCustomer
          ? t(
              'Fund the current milestone before work on it. Setu holds the money and releases it only when you approve.',
            )
          : t(
              'Upload photos before marking a milestone ready. Money is released when the customer approves.',
            )}
      </Small>
      {payment.paid ? <Notice tone="success">{t('Payment received. Thank you!')}</Notice> : null}
      {error || payment.error ? <Notice>{error ?? payment.error}</Notice> : null}
      {payment.checkout}
    </Card>
  );
}
