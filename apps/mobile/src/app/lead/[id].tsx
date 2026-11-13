import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { PhotoStrip } from '@/components/PhotoStrip';
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
import { ago, detailLines, leadBadge, QUOTE_STATUS_LABEL, rupees, when } from '@/lib/format';
import { useI18n } from '@/lib/i18n';

export default function LeadDetail() {
  const { t, d } = useI18n();
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
        <Notice>{t('This lead is no longer available.')}</Notice>
      </Screen>
    );
  const r = lead.requirement;
  const details = detailLines(r.details, t);
  const booking = r.details.booking as { totalPaise: number } | undefined;
  // A booking's description just repeats its items, which the detail lines already show.
  const description =
    !booking && typeof r.details.description === 'string' ? r.details.description : null;
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
            {d.requirementType[r.type]} · {lead.distanceKm} km · {ago(lead.sentAt, t)}
          </Small>
          <Badge label={t(leadBadge(lead)[0])} tone={leadBadge(lead)[1]} />
        </Row>
        <Title>{r.title}</Title>
        {description ? <Body>{description}</Body> : null}
        <PhotoStrip urls={r.photoUrls} />
        {details.map((line) => (
          <Small key={line}>{line}</Small>
        ))}
        <Small>
          {[lead.area.sector, lead.area.city, lead.area.pincode].filter(Boolean).join(', ')}
          {r.budgetMaxPaise
            ? ` · ${t('Budget up to {amount}', { amount: rupees(r.budgetMaxPaise) })}`
            : ''}
        </Small>
        <Small>
          {t('The exact address and phone number are shared once the customer hires you.')}
        </Small>
      </Card>

      {canQuote && booking ? (
        <Card>
          <Title>{t('Instant booking: {amount}', { amount: rupees(booking.totalPaise) })}</Title>
          <Small>
            {t(
              'The customer has booked at the listed price for the slot above. Accept to be assigned; the first professional to accept gets the job.',
            )}
          </Small>
          {error ? <Notice>{error}</Notice> : null}
          <Button
            testID="accept-booking"
            title={t('Accept booking')}
            kind="accent"
            icon="checkmark-circle"
            loading={busy}
            onPress={async () => {
              setBusy(true);
              setError(null);
              const res = await client.api.POST('/v1/partner/leads/{id}/accept-booking', {
                params: { path: { id: lead.id } },
              });
              setBusy(false);
              if (res.error) return setError(errorMessage(res.error));
              void queryClient.invalidateQueries({ queryKey: ['get', '/v1/partner/leads'] });
              void queryClient.invalidateQueries({ queryKey: ['get', '/v1/jobs'] });
              router.replace(`/job/${res.data.id}`);
            }}
          />
          <Button
            title={t('Not interested')}
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
        </Card>
      ) : null}

      {canQuote && !booking ? (
        <>
          <Title>{t('Your quote')}</Title>
          <QuoteBuilder
            gstRegistered={Boolean(partner.data?.gstin)}
            budget={{ minPaise: r.budgetMinPaise, maxPaise: r.budgetMaxPaise }}
            submitLabel={t('Send quote')}
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
            title={t('Not interested')}
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
            <Title>{t('Quote sent: {amount}', { amount: rupees(quote.data.totalPaise) })}</Title>
            <Badge
              label={t(QUOTE_STATUS_LABEL[quote.data.status])}
              tone={quote.data.status === 'accepted' ? 'success' : 'neutral'}
            />
          </Row>
          <Small>
            {t('Version {n}', { n: quote.data.version })}
            {quote.data.validUntil
              ? ` · ${t('Valid until {when}', { when: when(quote.data.validUntil) })}`
              : ''}
          </Small>
          {quote.data.thread.slice(1).map((m, idx) => (
            <Body key={idx}>
              {m.message} <Small>· {when(m.createdAt)}</Small>
            </Body>
          ))}
          {error ? <Notice>{error}</Notice> : null}
          {quote.data.status === 'sent' ? (
            <>
              <Button title={t('Revise quote')} kind="outline" onPress={() => setRevising(true)} />
              <Button
                title={t('Withdraw quote')}
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
          budget={{ minPaise: r.budgetMinPaise, maxPaise: r.budgetMaxPaise }}
          submitLabel={t('Send revised quote')}
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
