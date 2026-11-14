import { Stack } from 'expo-router';
import { useState } from 'react';
import { Linking, Share, Text, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
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

/** Refer and earn: share your code; rewards land after the friend's first completed job. */
export default function Refer() {
  const { t } = useI18n();
  const c = usePalette();
  const r = $api.useQuery('get', '/v1/me/referral');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (r.isPending) return <Loading />;
  if (!r.data)
    return (
      <Screen>
        <Notice>{errorMessage(r.error)}</Notice>
      </Screen>
    );
  const d = r.data;
  const text = t(
    'Book verified home pros on Abhiyantri Setu. Use my code {code} and we both get {amount} after your first job.',
    {
      code: d.code,
      amount: rupees(d.rewardPaise),
    },
  );

  async function apply() {
    setBusy(true);
    setMsg(null);
    const res = await client.api.POST('/v1/me/referral/apply', { body: { code: code.trim() } });
    setBusy(false);
    if (res.error) return setMsg({ ok: false, text: errorMessage(res.error) });
    setMsg({ ok: true, text: t('Code applied. You both earn after your first completed job.') });
    void queryClient.invalidateQueries({ queryKey: ['get', '/v1/me/referral'] });
  }

  return (
    <Screen refreshing={r.isRefetching} onRefresh={() => void r.refetch()}>
      <Stack.Screen options={{ title: t('Refer and earn') }} />
      <View
        style={{
          borderRadius: 22,
          backgroundColor: '#1E1B4F',
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
          {t('Your code').toUpperCase()}
        </Text>
        <Text
          testID="referral-code"
          selectable
          style={[
            typeScale['3xl'],
            { color: '#fff', fontFamily: font.headingHeavy, letterSpacing: 3 },
          ]}
        >
          {d.code}
        </Text>
        <Text style={[typeScale.sm, { color: 'rgba(255,255,255,0.8)', fontFamily: font.body }]}>
          {t('You and your friend each get {amount} after their first completed job.', {
            amount: rupees(d.rewardPaise),
          })}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing[2] }}>
        <View style={{ flex: 1 }}>
          <Button
            title={t('Share on WhatsApp')}
            icon="logo-whatsapp"
            onPress={() => void Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title={t('Share')}
            kind="outline"
            icon="share-social"
            onPress={() => void Share.share({ message: text })}
          />
        </View>
      </View>
      <Card>
        <Row>
          <Title>{t('Earned so far')}</Title>
          <Title>{rupees(d.earnedPaise)}</Title>
        </Row>
        <Small>{t("Rewards are added once your friend's first job is completed.")}</Small>
      </Card>
      {d.canApply ? (
        <Card>
          <Title>{t('Got a friend’s code?')}</Title>
          <Field
            label={t('Referral code')}
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            testID="apply-code"
          />
          <Button
            title={t('Apply code')}
            loading={busy}
            disabled={code.trim().length < 4}
            onPress={() => void apply()}
          />
        </Card>
      ) : null}
      {msg ? <Notice tone={msg.ok ? 'success' : 'danger'}>{msg.text}</Notice> : null}
      <Title>{t('Your referrals')}</Title>
      {d.referred.length === 0 ? (
        <Small>{t('No one yet. Share your code with friends and your society group.')}</Small>
      ) : null}
      {d.referred.map((f, i) => (
        <Card key={i}>
          <Row>
            <Text style={[typeScale.base, { color: c.text, fontFamily: font.semibold }]}>
              {f.firstName ?? t('Friend')}
            </Text>
            <Badge
              label={f.status === 'first_job_done' ? t('First job done') : t('Signed up')}
              tone={f.status === 'first_job_done' ? 'success' : 'info'}
            />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
