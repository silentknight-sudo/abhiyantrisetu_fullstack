import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Badge,
  Body,
  Button,
  Card,
  Empty,
  Field,
  Loading,
  Notice,
  Row,
  Screen,
  Small,
  Title,
} from '@/components/ui';
import { PhotoStrip } from '@/components/PhotoStrip';
import { $api, queryClient } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { ago, detailLines, QUOTE_STATUS_LABEL, requirementTone, rupees } from '@/lib/format';
import { useI18n } from '@/lib/i18n';

export default function RequirementDetail() {
  const { t, d } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const path = { params: { path: { id } } };
  const req = $api.useQuery('get', '/v1/requirements/{id}', path);
  const quotes = $api.useQuery('get', '/v1/requirements/{id}/quotes', path);
  const jobs = $api.useQuery('get', '/v1/jobs', {}, { enabled: req.data?.status === 'hired' });
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const cancel = $api.useMutation('post', '/v1/requirements/{id}/cancel', {
    onSuccess: () => {
      setCancelling(false);
      void queryClient.invalidateQueries({ queryKey: ['get', '/v1/requirements'] });
      void req.refetch();
    },
  });

  if (req.isPending) return <Loading />;
  if (req.error || !req.data)
    return (
      <Screen>
        <Notice>{errorMessage(req.error)}</Notice>
      </Screen>
    );
  const r = req.data;
  const job = jobs.data?.find((j) => j.requirementId === r.id);
  const open = ['requested', 'matched', 'quoted'].includes(r.status);
  const sent = (quotes.data ?? []).filter((q) => q.status !== 'withdrawn');
  const description = typeof r.details.description === 'string' ? r.details.description : null;

  return (
    <Screen
      refreshing={quotes.isRefetching}
      onRefresh={() => {
        void req.refetch();
        void quotes.refetch();
      }}
    >
      <Stack.Screen options={{ title: d.requirementType[r.type] }} />
      <Card>
        <Row>
          <Small>{t('Posted {when}', { when: ago(r.createdAt, t) })}</Small>
          <Badge label={d.requirementStatus[r.status]} tone={requirementTone(r.status)} />
        </Row>
        <Title>{r.title}</Title>
        {description ? <Body muted>{description}</Body> : null}
        {detailLines(r.details, t).map((line) => (
          <Small key={line}>{line}</Small>
        ))}
        <PhotoStrip urls={r.photoUrls} />
        {r.budgetMaxPaise ? (
          <Small>{t('Budget up to {amount}', { amount: rupees(r.budgetMaxPaise) })}</Small>
        ) : null}
      </Card>

      {job ? <Button title={t('Open job')} onPress={() => router.push(`/job/${job.id}`)} /> : null}

      <Title>{sent.length ? t('Quotes ({n})', { n: sent.length }) : t('Quotes')}</Title>
      {quotes.isPending ? <Loading /> : null}
      {quotes.data && sent.length === 0 && open ? (
        <Empty
          title={t('Waiting for quotes')}
          body={t(
            "We've told verified professionals near you. You'll get a notification when a quote arrives.",
          )}
        />
      ) : null}
      {sent.map((q) => (
        <Card key={q.id} onPress={() => router.push(`/quote/${q.id}`)}>
          <Row>
            <Title>{q.partner?.displayName ?? t('Professional')}</Title>
            <Title>{rupees(q.totalPaise)}</Title>
          </Row>
          <Row>
            <Small>
              {q.partner?.ratingAvg
                ? `★ ${q.partner.ratingAvg.toFixed(1)} (${q.partner.ratingCount})`
                : t('New on Setu')}
              {q.partner?.verificationStatus === 'verified' ? ` · ${t('Verified')}` : ''}
              {q.gstPaise > 0 ? ` · ${t('GST invoice')}` : ''}
            </Small>
            {q.status !== 'sent' ? (
              <Badge
                label={t(QUOTE_STATUS_LABEL[q.status])}
                tone={q.status === 'accepted' ? 'success' : 'neutral'}
              />
            ) : null}
          </Row>
          <Small>
            {t('{n} items', { n: q.items.length })}
            {q.version > 1 ? ` · ${t('revised (v{n})', { n: q.version })}` : ''}
          </Small>
        </Card>
      ))}

      {open && !cancelling ? (
        <Button title={t('Cancel request')} kind="outline" onPress={() => setCancelling(true)} />
      ) : null}
      {cancelling ? (
        <Card>
          <Field
            label={t('Why are you cancelling?')}
            value={reason}
            onChangeText={setReason}
            placeholder={t('e.g. Fixed it myself')}
          />
          {cancel.error ? <Notice>{errorMessage(cancel.error)}</Notice> : null}
          <Button
            title={t('Cancel request')}
            kind="danger"
            loading={cancel.isPending}
            disabled={reason.trim().length < 3}
            onPress={() => cancel.mutate({ ...path, body: { reason: reason.trim() } })}
          />
          <Button title={t('Keep it open')} kind="outline" onPress={() => setCancelling(false)} />
        </Card>
      ) : null}
    </Screen>
  );
}
