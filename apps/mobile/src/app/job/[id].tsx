import { Stack, useLocalSearchParams } from 'expo-router';
import { Linking } from 'react-native';
import { useState } from 'react';
import { PaySection } from '@/components/PaySection';
import { JobReview } from '@/components/Reviews';
import {
  Badge,
  Body,
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
import { $api, queryClient } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { jobTone, rupees, when } from '@/lib/format';
import { useI18n } from '@/lib/i18n';

/** Quick visit slots; a full date-time picker can come later. */
function slots(now = new Date()) {
  const at = (days: number, hour: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d;
  };
  return [at(0, 18), at(1, 10), at(1, 16), at(2, 10), at(2, 16)]
    .filter((d) => d.getTime() > now.getTime() + 60 * 60_000)
    .map((d) => ({ iso: d.toISOString(), label: when(d.toISOString()) }));
}

export default function JobDetail() {
  const { t, d } = useI18n();
  const params = useLocalSearchParams<{ id: string; startCode?: string }>();
  const path = { params: { path: { id: params.id } } };
  const job = $api.useQuery('get', '/v1/jobs/{id}', path);
  const history = $api.useQuery('get', '/v1/jobs/{id}/events', path);
  const [startCode, setStartCode] = useState(params.startCode ?? null);
  const [codeInput, setCodeInput] = useState('');
  const [reason, setReason] = useState('');
  const [asking, setAsking] = useState<'dispute' | 'cancel' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['get', '/v1/jobs'] });
    void job.refetch();
    void history.refetch();
  };
  const opts = {
    onSuccess: () => {
      setError(null);
      setAsking(null);
      refresh();
    },
    onError: (e: unknown) => setError(errorMessage(e)),
  };
  const schedule = $api.useMutation('post', '/v1/jobs/{id}/schedule', opts);
  const reschedule = $api.useMutation('post', '/v1/jobs/{id}/reschedule', opts);
  const start = $api.useMutation('post', '/v1/jobs/{id}/start', opts);
  const complete = $api.useMutation('post', '/v1/jobs/{id}/complete', opts);
  const confirm = $api.useMutation('post', '/v1/jobs/{id}/confirm', opts);
  const cancel = $api.useMutation('post', '/v1/jobs/{id}/cancel', opts);
  const dispute = $api.useMutation('post', '/v1/jobs/{id}/dispute', opts);
  const newCode = $api.useMutation('post', '/v1/jobs/{id}/start-code', {
    onSuccess: (r) => setStartCode(r.startCode),
    onError: (e) => setError(errorMessage(e)),
  });

  if (job.isPending) return <Loading />;
  if (job.error || !job.data)
    return (
      <Screen>
        <Notice>{errorMessage(job.error)}</Notice>
      </Screen>
    );
  const j = job.data;
  const can = (a: (typeof j.availableActions)[number]) => j.availableActions.includes(a);
  const isCustomer = j.viewerRole === 'customer';
  const pickSlot = can('schedule') ? schedule : can('reschedule') ? reschedule : null;

  return (
    <Screen refreshing={job.isRefetching} onRefresh={refresh}>
      <Stack.Screen options={{ title: j.title }} />
      <Card>
        <Row>
          <Title>{rupees(j.agreedTotalPaise)}</Title>
          <Badge label={d.jobState[j.state]} tone={jobTone(j.state)} />
        </Row>
        <Small>
          {j.slotStart
            ? t('Visit: {when}', { when: when(j.slotStart) })
            : t('Visit not scheduled yet')}
          {j.completedAt ? ` · ${t('Completed {when}', { when: when(j.completedAt) })}` : ''}
        </Small>
      </Card>

      {j.contact ? (
        <Card>
          <Small>{isCustomer ? t('Your professional') : t('Customer')}</Small>
          <Title>{j.contact.name ?? j.contact.phone}</Title>
          {j.contact.address ? (
            <Body>
              {[
                j.contact.address.flat,
                j.contact.address.tower,
                j.contact.address.line1,
                j.contact.address.line2,
              ]
                .filter(Boolean)
                .join(', ')}
              {'\n'}
              {[j.contact.address.sector, j.contact.address.city, j.contact.address.pincode]
                .filter(Boolean)
                .join(', ')}
            </Body>
          ) : null}
          <Row style={{ justifyContent: 'flex-start' }}>
            <Button
              title={t('Call')}
              kind="outline"
              onPress={() => void Linking.openURL(`tel:${j.contact!.phone}`)}
            />
            {j.contact.address ? (
              <Button
                title={t('Directions')}
                kind="outline"
                onPress={() => {
                  const { lat, lng } = j.contact!.address!.location;
                  void Linking.openURL(
                    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
                  );
                }}
              />
            ) : null}
          </Row>
        </Card>
      ) : null}

      {isCustomer && startCode && ['hired', 'scheduled'].includes(j.state) ? (
        <Card>
          <Small>{t('Start code: share it only when the professional arrives')}</Small>
          <Title>{startCode.split('').join(' ')}</Title>
        </Card>
      ) : null}

      {error ? <Notice>{error}</Notice> : null}

      {pickSlot ? (
        <Card>
          <Title>{j.slotStart ? t('Change the visit time') : t('Pick a visit time')}</Title>
          <Chips>
            {slots().map((s) => (
              <Chip
                key={s.iso}
                label={s.label}
                onPress={() => pickSlot.mutate({ ...path, body: { slotStart: s.iso } })}
              />
            ))}
          </Chips>
        </Card>
      ) : null}

      {can('start') ? (
        <Card>
          <Title>{t('Start the job')}</Title>
          <Field
            label={t("Customer's 4-digit start code")}
            testID="start-code"
            value={codeInput}
            onChangeText={setCodeInput}
            keyboardType="number-pad"
            maxLength={4}
          />
          <Button
            title={t('Start')}
            testID="start"
            loading={start.isPending}
            disabled={!/^\d{4}$/.test(codeInput)}
            onPress={() => start.mutate({ ...path, body: { startCode: codeInput } })}
          />
        </Card>
      ) : null}

      {can('complete') ? (
        <Button
          title={t('Mark work as done')}
          kind="accent"
          testID="complete"
          loading={complete.isPending}
          onPress={() => complete.mutate(path)}
        />
      ) : null}

      {can('confirm') ? (
        <Card>
          <Title>{t('Is the work done?')}</Title>
          <Small>
            {t(
              'Confirming releases the payment to the professional. If you do nothing, the job is confirmed automatically after 48 hours.',
            )}
          </Small>
          <Button
            title={t('Yes, confirm')}
            kind="accent"
            testID="confirm"
            loading={confirm.isPending}
            onPress={() => confirm.mutate(path)}
          />
        </Card>
      ) : null}

      {isCustomer ? (
        <PaySection
          jobId={j.id}
          canPay={['hired', 'scheduled', 'in_progress', 'completed'].includes(j.state)}
        />
      ) : null}

      {isCustomer && (can('start') || ['hired', 'scheduled'].includes(j.state)) ? (
        <Button
          title={t('Get a new start code')}
          kind="outline"
          loading={newCode.isPending}
          onPress={() => newCode.mutate(path)}
        />
      ) : null}

      {asking ? (
        <Card>
          <Field
            label={asking === 'dispute' ? t('What went wrong?') : t('Why are you cancelling?')}
            value={reason}
            onChangeText={setReason}
            multiline
          />
          <Button
            title={asking === 'dispute' ? t('Raise a dispute') : t('Cancel job')}
            kind="danger"
            loading={dispute.isPending || cancel.isPending}
            disabled={reason.trim().length < 3}
            onPress={() =>
              (asking === 'dispute' ? dispute : cancel).mutate({
                ...path,
                body: { reason: reason.trim() },
              })
            }
          />
          <Button title={t('Back')} kind="outline" onPress={() => setAsking(null)} />
        </Card>
      ) : (
        <>
          {can('dispute') ? (
            <Button
              title={t('Report a problem')}
              kind="outline"
              onPress={() => setAsking('dispute')}
            />
          ) : null}
          {can('cancel') ? (
            <Button title={t('Cancel job')} kind="outline" onPress={() => setAsking('cancel')} />
          ) : null}
        </>
      )}

      {j.state === 'disputed' ? (
        <Notice tone="info">
          {t('Our team is looking into this. Payment stays on hold until it is resolved.')}
        </Notice>
      ) : null}

      <JobReview jobId={j.id} viewer={j.viewerRole} closed={j.state === 'closed'} />

      {history.data?.length ? (
        <Card>
          <Title>{t('Timeline')}</Title>
          {history.data.map((e) => (
            <Body key={e.id}>
              {d.jobState[e.toState]} <Small>· {when(e.createdAt)}</Small>
            </Body>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
