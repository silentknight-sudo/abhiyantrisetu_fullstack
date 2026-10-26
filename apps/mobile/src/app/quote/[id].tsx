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
import { QUOTE_STATUS_LABEL, rupees, tradeName, when } from '@/lib/format';
import { useI18n } from '@/lib/i18n';

export default function QuoteDetail() {
  const { t } = useI18n();
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
          <Title>{p?.displayName ?? t('Professional')}</Title>
          {p?.verificationStatus === 'verified' ? (
            <Badge label={t('Verified')} tone="success" />
          ) : null}
        </Row>
        {p ? (
          <Small>
            {p.trades.map((s) => tradeName(s, t)).join(', ')}
            {p.ratingAvg ? ` · ★ ${p.ratingAvg.toFixed(1)} (${p.ratingCount})` : ''}
            {p.avgResponseMinutes
              ? ` · ${t('replies in ~{n} min', { n: p.avgResponseMinutes })}`
              : ''}
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
          <Small>{t('Subtotal')}</Small>
          <Small>{rupees(q.subtotalPaise)}</Small>
        </Row>
        {q.gstPaise > 0 ? (
          <Row>
            <Small>{t('GST {rate}%', { rate: q.gstRate ?? 0 })}</Small>
            <Small>{rupees(q.gstPaise)}</Small>
          </Row>
        ) : null}
        <Row>
          <Title>{t('Total')}</Title>
          <Title>{rupees(q.totalPaise)}</Title>
        </Row>
        {q.notes ? <Body muted>{q.notes}</Body> : null}
        {q.validUntil ? (
          <Small>{t('Valid until {when}', { when: when(q.validUntil) })}</Small>
        ) : null}
      </Card>

      {p ? <PartnerReviews partnerId={p.id} /> : null}

      {q.thread.length > 1 ? (
        <Card>
          <Title>{t('Conversation')}</Title>
          {q.thread.slice(1).map((m, idx) => (
            <Body key={idx}>
              {m.message ?? t('Revised quote (v{n})', { n: m.version })}{' '}
              <Small>· {when(m.createdAt)}</Small>
            </Body>
          ))}
        </Card>
      ) : null}

      {q.status === 'sent' ? (
        <>
          {accept.error ? <Notice>{errorMessage(accept.error)}</Notice> : null}
          <Button
            title={t('Hire for {amount}', { amount: rupees(q.totalPaise) })}
            kind="accent"
            testID="accept-quote"
            loading={accept.isPending}
            onPress={() => accept.mutate(path)}
          />
          <Small>
            {t(
              'You pay through Setu after hiring. The money is held safely and released to the professional only when you confirm the work is done.',
            )}
          </Small>
          <Card>
            <Title>{t('Ask for changes')}</Title>
            <Field
              label={t('Message')}
              value={message}
              onChangeText={setMessage}
              placeholder={t('e.g. Can you include the fittings?')}
            />
            <Field
              label={t('Your price (₹, optional)')}
              value={counter}
              onChangeText={setCounter}
              keyboardType="number-pad"
            />
            {negotiate.error ? <Notice>{errorMessage(negotiate.error)}</Notice> : null}
            <Button
              title={t('Send')}
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
        <Notice tone="info">
          {t('This quote is {status}.', { status: t(QUOTE_STATUS_LABEL[q.status]).toLowerCase() })}
        </Notice>
      )}
    </Screen>
  );
}
