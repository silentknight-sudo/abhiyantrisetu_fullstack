import { router, useLocalSearchParams } from 'expo-router';
import { PartnerReviews } from '@/components/Reviews';
import { useState } from 'react';
import {
  Badge,
  Body,
  Button,
  Card,
  Divider,
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
import { rupees, tradeLabel, when } from '@/lib/format';

export default function QuoteDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const path = { params: { path: { id } } };
  const quote = $api.useQuery('get', '/v1/quotes/{id}', path);
  const [message, setMessage] = useState('');
  const [counter, setCounter] = useState('');
  const negotiate = $api.useMutation('post', '/v1/quotes/{id}/negotiate', {
    onSuccess: () => {
      setMessage('');
      setCounter('');
      void quote.refetch();
    },
  });
  const accept = $api.useMutation('post', '/v1/quotes/{id}/accept', {
    onSuccess: (hired) => {
      void queryClient.invalidateQueries();
      // The start code is shown once; the partner asks for it on arrival.
      router.replace({
        pathname: '/job/[id]',
        params: { id: hired.job.id, startCode: hired.startCode },
      });
    },
  });

  if (quote.isPending) return <Loading />;
  if (quote.error || !quote.data)
    return (
      <Screen>
        <Notice>{errorMessage(quote.error)}</Notice>
      </Screen>
    );
  const q = quote.data;
  const p = q.partner;
  const counterRupees = Number(counter.replace(/[^\d]/g, ''));

  return (
    <Screen>
      <Card>
        <Row>
          <Title>{p?.displayName ?? 'Professional'}</Title>
          {p?.verificationStatus === 'verified' ? <Badge label="Verified" tone="success" /> : null}
        </Row>
        {p ? (
          <Small>
            {p.trades.map(tradeLabel).join(', ')}
            {p.ratingAvg ? ` · ★ ${p.ratingAvg.toFixed(1)} (${p.ratingCount})` : ''}
            {p.avgResponseMinutes ? ` · replies in ~${p.avgResponseMinutes} min` : ''}
          </Small>
        ) : null}
      </Card>

      <Card>
        {q.items.map((i) => (
          <Row key={i.id}>
            <Body style={{ flex: 1 }}>
              {i.description} · {i.quantity}
              {i.unit ? ` ${i.unit}` : ''} × {rupees(i.unitPricePaise)}
            </Body>
            <Body>{rupees(i.amountPaise)}</Body>
          </Row>
        ))}
        <Divider />
        <Row>
          <Small>Subtotal</Small>
          <Small>{rupees(q.subtotalPaise)}</Small>
        </Row>
        {q.gstPaise > 0 ? (
          <Row>
            <Small>GST {q.gstRate}%</Small>
            <Small>{rupees(q.gstPaise)}</Small>
          </Row>
        ) : null}
        <Row>
          <Title>Total</Title>
          <Title>{rupees(q.totalPaise)}</Title>
        </Row>
        {q.notes ? <Body muted>{q.notes}</Body> : null}
        {q.validUntil ? <Small>Valid until {when(q.validUntil)}</Small> : null}
      </Card>

      {p ? <PartnerReviews partnerId={p.id} /> : null}

      {q.thread.length > 1 ? (
        <Card>
          <Title>Conversation</Title>
          {q.thread.slice(1).map((m, idx) => (
            <Body key={idx}>
              {m.message ?? `Revised quote (v${m.version})`} <Small>· {when(m.createdAt)}</Small>
            </Body>
          ))}
        </Card>
      ) : null}

      {q.status === 'sent' ? (
        <>
          {accept.error ? <Notice>{errorMessage(accept.error)}</Notice> : null}
          <Button
            title={`Hire for ${rupees(q.totalPaise)}`}
            kind="accent"
            testID="accept-quote"
            loading={accept.isPending}
            onPress={() => accept.mutate(path)}
          />
          <Small>
            You pay through Setu after hiring. The money is held safely and released to the
            professional only when you confirm the work is done.
          </Small>
          <Card>
            <Title>Ask for changes</Title>
            <Field
              label="Message"
              value={message}
              onChangeText={setMessage}
              placeholder="e.g. Can you include the fittings?"
            />
            <Field
              label="Your price (₹, optional)"
              value={counter}
              onChangeText={setCounter}
              keyboardType="number-pad"
            />
            {negotiate.error ? <Notice>{errorMessage(negotiate.error)}</Notice> : null}
            <Button
              title="Send"
              kind="outline"
              loading={negotiate.isPending}
              disabled={message.trim().length < 3}
              onPress={() =>
                negotiate.mutate({
                  ...path,
                  body: {
                    message: message.trim(),
                    targetTotalPaise: counterRupees > 0 ? counterRupees * 100 : undefined,
                  },
                })
              }
            />
          </Card>
        </>
      ) : (
        <Notice tone="info">This quote is {q.status}.</Notice>
      )}
    </Screen>
  );
}
