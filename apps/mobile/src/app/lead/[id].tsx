import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { QuoteBuilder } from '@/components/QuoteBuilder';
import {
  Badge,
  Body,
  Button,
  Card,
  Loading,
  Notice,
  Row,
  Screen,
  Small,
  Title,
} from '@/components/ui';
import { $api, client, queryClient } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { ago, LEAD_STATUS, requirementTypeLabel, rupees, when } from '@/lib/format';

const DETAIL_LABELS: Record<string, string> = {
  urgency: 'When',
  propertyType: 'Property',
  scope: 'Areas',
  areaSqft: 'Area (sq ft)',
  topic: 'Topic',
  mode: 'Consultation',
};

export default function LeadDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const leads = $api.useQuery('get', '/v1/partner/leads');
  const partner = $api.useQuery('get', '/v1/partners/me');
  const lead = leads.data?.find((l) => l.id === id);
  const quote = $api.useQuery(
    'get',
    '/v1/quotes/{id}',
    { params: { path: { id: lead?.quoteId ?? '' } } },
    { enabled: Boolean(lead?.quoteId) },
  );
  const [revising, setRevising] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Opening a lead marks it seen (the customer's "viewed by" signal).
  useEffect(() => {
    if (lead?.status === 'sent') {
      void client.api
        .POST('/v1/partner/leads/{id}/seen', { params: { path: { id: lead.id } } })
        .then(() => queryClient.invalidateQueries({ queryKey: ['get', '/v1/partner/leads'] }));
    }
  }, [lead?.id, lead?.status]);

  if (leads.isPending) return <Loading />;
  if (!lead)
    return (
      <Screen>
        <Notice>This lead is no longer available.</Notice>
      </Screen>
    );
  const r = lead.requirement;
  const details = Object.entries(r.details).filter(
    ([k, v]) => DETAIL_LABELS[k] && v !== undefined && v !== null,
  );
  const description = typeof r.details.description === 'string' ? r.details.description : null;
  const canQuote =
    ['sent', 'seen'].includes(lead.status) && ['requested', 'matched', 'quoted'].includes(r.status);
  const done = async () => {
    await queryClient.invalidateQueries({ queryKey: ['get', '/v1/partner/leads'] });
    await queryClient.invalidateQueries({ queryKey: ['get', '/v1/quotes/{id}'] });
    setRevising(false);
  };
  async function run(call: () => Promise<{ data?: unknown; error?: unknown }>) {
    setBusy(true);
    setError(null);
    try {
      const res = await call();
      if (res.error) throw res.error;
      await done();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Card>
        <Row>
          <Small>
            {requirementTypeLabel(r.type)} · {lead.distanceKm} km · {ago(lead.sentAt)}
          </Small>
          <Badge label={LEAD_STATUS[lead.status][0]} tone={LEAD_STATUS[lead.status][1]} />
        </Row>
        <Title>{r.title}</Title>
        {description ? <Body>{description}</Body> : null}
        {details.map(([k, v]) => (
          <Small key={k}>
            {DETAIL_LABELS[k]}: {Array.isArray(v) ? v.join(', ') : String(v).replace(/_/g, ' ')}
          </Small>
        ))}
        <Small>
          {[lead.area.sector, lead.area.city, lead.area.pincode].filter(Boolean).join(', ')}
          {r.budgetMaxPaise ? ` · budget up to ${rupees(r.budgetMaxPaise)}` : ''}
        </Small>
        <Small>The exact address and phone number are shared once the customer hires you.</Small>
      </Card>

      {canQuote ? (
        <>
          <Title>Your quote</Title>
          <QuoteBuilder
            gstRegistered={Boolean(partner.data?.gstin)}
            submitLabel="Send quote"
            busy={busy}
            error={error}
            onSubmit={(body) =>
              run(() =>
                client.api.POST('/v1/partner/leads/{id}/quote', {
                  params: { path: { id: lead.id } },
                  body,
                }),
              )
            }
          />
          <Button
            title="Not interested"
            kind="outline"
            onPress={() =>
              run(async () => {
                const res = await client.api.POST('/v1/partner/leads/{id}/decline', {
                  params: { path: { id: lead.id } },
                });
                if (!res.error) router.back();
                return res;
              })
            }
          />
        </>
      ) : null}

      {quote.data && !revising ? (
        <Card>
          <Row>
            <Title>Quote sent: {rupees(quote.data.totalPaise)}</Title>
            <Badge
              label={quote.data.status}
              tone={quote.data.status === 'accepted' ? 'success' : 'neutral'}
            />
          </Row>
          <Small>
            Version {quote.data.version}
            {quote.data.validUntil ? ` · valid until ${when(quote.data.validUntil)}` : ''}
          </Small>
          {quote.data.thread.slice(1).map((m, idx) => (
            <Body key={idx}>
              {m.message} <Small>· {when(m.createdAt)}</Small>
            </Body>
          ))}
          {error ? <Notice>{error}</Notice> : null}
          {quote.data.status === 'sent' ? (
            <>
              <Button title="Revise quote" kind="outline" onPress={() => setRevising(true)} />
              <Button
                title="Withdraw quote"
                kind="danger"
                loading={busy}
                onPress={() =>
                  run(() =>
                    client.api.POST('/v1/quotes/{id}/withdraw', {
                      params: { path: { id: quote.data!.id } },
                    }),
                  )
                }
              />
            </>
          ) : null}
        </Card>
      ) : null}

      {quote.data && revising ? (
        <QuoteBuilder
          initial={quote.data}
          gstRegistered={Boolean(partner.data?.gstin)}
          submitLabel="Send revised quote"
          withMessage
          busy={busy}
          error={error}
          onSubmit={(body, message) =>
            run(() =>
              client.api.POST('/v1/quotes/{id}/revise', {
                params: { path: { id: quote.data!.id } },
                body: { ...body, message },
              }),
            )
          }
        />
      ) : null}
    </Screen>
  );
}
