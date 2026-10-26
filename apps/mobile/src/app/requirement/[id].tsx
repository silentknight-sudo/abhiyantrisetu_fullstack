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
import {
  ago,
  requirementStatusLabel,
  requirementTone,
  requirementTypeLabel,
  rupees,
} from '@/lib/format';

export default function RequirementDetail() {
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
      <Stack.Screen options={{ title: requirementTypeLabel(r.type) }} />
      <Card>
        <Row>
          <Small>Posted {ago(r.createdAt)}</Small>
          <Badge label={requirementStatusLabel(r.status)} tone={requirementTone(r.status)} />
        </Row>
        <Title>{r.title}</Title>
        {description ? <Body muted>{description}</Body> : null}
        <PhotoStrip urls={r.photoUrls} />
        {r.budgetMaxPaise ? <Small>Budget up to {rupees(r.budgetMaxPaise)}</Small> : null}
      </Card>

      {job ? <Button title="Open job" onPress={() => router.push(`/job/${job.id}`)} /> : null}

      <Title>Quotes {sent.length ? `(${sent.length})` : ''}</Title>
      {quotes.isPending ? <Loading /> : null}
      {quotes.data && sent.length === 0 && open ? (
        <Empty
          title="Waiting for quotes"
          body="We've told verified professionals near you. You'll get a notification when a quote arrives."
        />
      ) : null}
      {sent.map((q) => (
        <Card key={q.id} onPress={() => router.push(`/quote/${q.id}`)}>
          <Row>
            <Title>{q.partner?.displayName ?? 'Professional'}</Title>
            <Title>{rupees(q.totalPaise)}</Title>
          </Row>
          <Row>
            <Small>
              {q.partner?.ratingAvg
                ? `★ ${q.partner.ratingAvg.toFixed(1)} (${q.partner.ratingCount})`
                : 'New on Setu'}
              {q.partner?.verificationStatus === 'verified' ? ' · Verified' : ''}
              {q.gstPaise > 0 ? ' · GST invoice' : ''}
            </Small>
            {q.status !== 'sent' ? (
              <Badge label={q.status} tone={q.status === 'accepted' ? 'success' : 'neutral'} />
            ) : null}
          </Row>
          <Small>
            {q.items.length} item{q.items.length === 1 ? '' : 's'}
            {q.version > 1 ? ` · revised (v${q.version})` : ''}
          </Small>
        </Card>
      ))}

      {open && !cancelling ? (
        <Button title="Cancel request" kind="outline" onPress={() => setCancelling(true)} />
      ) : null}
      {cancelling ? (
        <Card>
          <Field
            label="Why are you cancelling?"
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Fixed it myself"
          />
          {cancel.error ? <Notice>{errorMessage(cancel.error)}</Notice> : null}
          <Button
            title="Cancel request"
            kind="danger"
            loading={cancel.isPending}
            disabled={reason.trim().length < 3}
            onPress={() => cancel.mutate({ ...path, body: { reason: reason.trim() } })}
          />
          <Button title="Keep it open" kind="outline" onPress={() => setCancelling(false)} />
        </Card>
      ) : null}
    </Screen>
  );
}
