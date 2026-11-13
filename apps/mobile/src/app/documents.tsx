import { Stack } from 'expo-router';
import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { PhotoPicker } from '@/components/PhotoPicker';
import {
  Badge,
  Button,
  Card,
  Chip,
  Chips,
  Loading,
  Notice,
  Row,
  Screen,
  Small,
  Title,
} from '@/components/ui';
import { $api, client, queryClient } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { type MessageKey, useI18n } from '@/lib/i18n';
import { font, spacing, typeScale, usePalette } from '@/lib/theme';

const LABEL: Record<string, [MessageKey, MessageKey]> = {
  aadhaar: ['Aadhaar', 'Front and back, or the DigiLocker copy'],
  pan: ['PAN card', 'Clear photo of the card'],
  selfie: ['Live selfie', 'Your face, clearly visible'],
  bank_account: ['Bank account or UPI for payouts', 'Cancelled cheque or passbook page'],
  police_verification: ['Police verification', 'Needed for work inside homes'],
  gst_certificate: ['GST certificate', 'Because you added a GSTIN'],
  other: ['Skill certificate or work photos', 'Optional, earns a badge'],
};
const STEP: Record<string, MessageKey> = {
  documents: 'Documents uploaded',
  review: 'Checked by Setu',
  live: 'Profile live',
};
const TONE = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  expired: 'danger',
} as const;
const STATUS: Record<string, MessageKey> = {
  pending: 'Being checked',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
};
const inMonths = (m: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + m);
  return d.toISOString().slice(0, 10);
};

/** My documents: what Setu needs, its review status, and expiry reminders. */
export default function Documents() {
  const { t } = useI18n();
  const c = usePalette();
  const data = $api.useQuery('get', '/v1/partners/me/documents');
  const [open, setOpen] = useState<string | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [expires, setExpires] = useState(inMonths(12));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (data.isPending) return <Loading />;
  if (!data.data)
    return (
      <Screen>
        <Notice>{errorMessage(data.error)}</Notice>
      </Screen>
    );
  const d = data.data;
  const kinds = [
    ...d.required,
    ...Object.keys(LABEL).filter((k) => !d.required.includes(k) && k !== 'gst_certificate'),
  ];

  async function save(kind: string) {
    if (!key) return;
    setBusy(true);
    setError(null);
    const res = await client.api.POST('/v1/partners/me/documents', {
      body: {
        kind: kind as never,
        fileKey: key,
        ...(kind === 'police_verification' ? { expiresOn: expires } : {}),
      },
    });
    setBusy(false);
    if (res.error) return setError(errorMessage(res.error));
    setOpen(null);
    setKey(null);
    void queryClient.invalidateQueries({ queryKey: ['get', '/v1/partners/me/documents'] });
  }

  return (
    <Screen refreshing={data.isRefetching} onRefresh={() => void data.refetch()}>
      <Stack.Screen options={{ title: t('My documents') }} />
      <Card>
        <Title>{t('Verification')}</Title>
        {d.steps.map((s, i) => (
          <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: s.done ? c.success : c.surfaceMuted,
              }}
            >
              <Text
                style={[
                  typeScale.xs,
                  { color: s.done ? '#fff' : c.textMuted, fontFamily: font.semibold },
                ]}
              >
                {s.done ? '✓' : i + 1}
              </Text>
            </View>
            <Text
              style={[
                typeScale.base,
                { color: c.text, fontFamily: s.done ? font.semibold : font.body },
              ]}
            >
              {t(STEP[s.key] ?? 'Documents uploaded')}
            </Text>
          </View>
        ))}
        <Small>
          {t('Documents are stored privately. Customers see only the badges, never the documents.')}
        </Small>
      </Card>
      {d.missing.length ? (
        <Notice tone="info">
          {t('{n} documents still needed before you can get leads.', { n: d.missing.length })}
        </Notice>
      ) : null}

      {kinds.map((kind) => {
        const doc = d.documents.find((x) => x.kind === kind);
        const [title, hint] = LABEL[kind] ?? [kind as MessageKey, '' as MessageKey];
        const soon = doc?.expiresInDays != null && doc.expiresInDays <= 30;
        return (
          <Card key={kind}>
            <Row>
              <View style={{ flex: 1 }}>
                <Text style={[typeScale.base, { color: c.text, fontFamily: font.heading }]}>
                  {t(title)}
                </Text>
                <Small>{d.required.includes(kind) ? t(hint) : t('Optional, earns a badge')}</Small>
              </View>
              {doc ? (
                <Badge label={t(STATUS[doc.status] ?? 'Being checked')} tone={TONE[doc.status]} />
              ) : d.required.includes(kind) ? (
                <Badge label={t('Required')} tone="neutral" />
              ) : null}
            </Row>
            {doc?.status === 'rejected' && doc.note ? <Notice>{doc.note}</Notice> : null}
            {doc?.expiresInDays != null ? (
              <Small muted={!soon}>
                {doc.expiresInDays < 0
                  ? t('Expired. Renew to keep your badge and leads.')
                  : t('Expires in {n} days', { n: doc.expiresInDays })}
              </Small>
            ) : null}
            {doc?.url ? (
              <Image
                source={{ uri: doc.url }}
                accessibilityIgnoresInvertColors
                style={{ width: 72, height: 72, borderRadius: 10, backgroundColor: c.surfaceMuted }}
              />
            ) : null}
            {open === kind ? (
              <View style={{ gap: spacing[2] }}>
                <PhotoPicker
                  max={1}
                  purpose="partner_document"
                  onChange={(k, up) => {
                    setKey(k[0] ?? null);
                    setUploading(up);
                  }}
                />
                {kind === 'police_verification' ? (
                  <>
                    <Small muted={false}>{t('Valid until')}</Small>
                    <Chips>
                      {[6, 12, 24].map((m) => (
                        <Chip
                          key={m}
                          label={t('{n} months', { n: m })}
                          selected={expires === inMonths(m)}
                          onPress={() => setExpires(inMonths(m))}
                        />
                      ))}
                    </Chips>
                  </>
                ) : null}
                <Button
                  title={t('Submit for checking')}
                  loading={busy || uploading}
                  disabled={!key}
                  onPress={() => void save(kind)}
                />
                <Button title={t('Cancel')} kind="outline" onPress={() => setOpen(null)} />
              </View>
            ) : (
              <Button
                testID={`doc-${kind}`}
                title={doc ? t('Replace') : t('Upload')}
                kind={doc && !soon && doc.status !== 'rejected' ? 'outline' : 'primary'}
                onPress={() => {
                  setOpen(kind);
                  setKey(null);
                }}
              />
            )}
          </Card>
        );
      })}
      {error ? <Notice>{error}</Notice> : null}
      <Small>{t('Your home screen warns you 30 days before a document expires.')}</Small>
    </Screen>
  );
}
