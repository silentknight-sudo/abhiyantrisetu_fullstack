import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, Card, Chip, Chips, Field, Notice, Screen, Small, Title } from '@/components/ui';
import { client } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { type MessageKey, useI18n } from '@/lib/i18n';

type Reason =
  'no_show' | 'rude_or_unsafe' | 'asked_cash_outside_app' | 'poor_work' | 'fake_profile' | 'other';
const REASONS: [Reason, MessageKey][] = [
  ['no_show', 'Did not turn up'],
  ['rude_or_unsafe', 'Rude or made me feel unsafe'],
  ['asked_cash_outside_app', 'Asked me to pay outside the app'],
  ['poor_work', 'Poor quality work'],
  ['fake_profile', 'Not the person in the profile'],
  ['other', 'Something else'],
];

/** Report a professional to Setu's trust & safety team. */
export default function Report() {
  const { t } = useI18n();
  const { partnerId, jobId, name } = useLocalSearchParams<{
    partnerId: string;
    jobId?: string;
    name?: string;
  }>();
  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function send() {
    if (!reason) return;
    setBusy(true);
    setError(null);
    const res = await client.api.POST('/v1/reports', {
      body: {
        partnerId,
        ...(jobId ? { jobId } : {}),
        reason,
        ...(details.trim() ? { details: details.trim() } : {}),
      },
    });
    setBusy(false);
    if (res.error) setError(errorMessage(res.error));
    else setSent(true);
  }

  if (sent) {
    return (
      <Screen>
        <Notice tone="success">
          {t('Thank you. Our team will look into it and may call you.')}
        </Notice>
        <Button title={t('Done')} onPress={() => router.back()} />
      </Screen>
    );
  }
  return (
    <Screen>
      <Card>
        <Title>{name ? t('Report {name}', { name }) : t('Report a professional')}</Title>
        <Small>
          {t('Only Setu sees this report. The professional is not told who reported them.')}
        </Small>
        <Chips>
          {REASONS.map(([k, label]) => (
            <Chip
              key={k}
              testID={`reason-${k}`}
              label={t(label)}
              selected={reason === k}
              onPress={() => setReason(k)}
            />
          ))}
        </Chips>
        <Field
          label={t('What happened? (optional)')}
          value={details}
          onChangeText={setDetails}
          multiline
          testID="report-details"
        />
        <Button
          testID="send-report"
          title={t('Send report')}
          loading={busy}
          disabled={!reason}
          onPress={() => void send()}
        />
        <Small>{t('If you are in danger, call 112 first.')}</Small>
      </Card>
      {error ? <Notice>{error}</Notice> : null}
    </Screen>
  );
}
