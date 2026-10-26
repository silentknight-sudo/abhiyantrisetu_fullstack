import type { PaymentOrder } from '@setu/api-client';
import { useState } from 'react';
import { $api, client, queryClient } from '@/lib/api';
import { type CheckoutResult, isFakeOrder } from '@/lib/checkout';
import { errorMessage } from '@/lib/errors';
import { rupees } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { RazorpayCheckout } from './RazorpayCheckout';
import { Badge, Button, Card, Notice, Row, Small, Title } from './ui';

/** What the customer owes on a job, and the button to pay it. */
export function PaySection({ jobId, canPay }: { jobId: string; canPay: boolean }) {
  const { t } = useI18n();
  const path = { params: { path: { id: jobId } } };
  const summary = $api.useQuery('get', '/v1/jobs/{id}/payments', path);
  const me = $api.useQuery('get', '/v1/me');
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  async function done() {
    setPaid(true);
    await queryClient.invalidateQueries({ queryKey: ['get', '/v1/jobs/{id}/payments'] });
  }

  async function start() {
    setError(null);
    setBusy(true);
    try {
      const res = await client.api.POST('/v1/payments/orders', { body: { jobId } });
      if (!res.data) throw res.error;
      if (isFakeOrder(res.data)) {
        const fake = await client.api.POST('/v1/payments/fake-checkout', {
          body: { razorpayOrderId: res.data.razorpayOrderId },
        });
        if (!fake.data) throw fake.error;
        await done();
        setBusy(false);
      } else {
        setOrder(res.data); // opens Razorpay; busy until it reports back
      }
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  async function onResult(result: CheckoutResult | { error: string } | null) {
    setOrder(null);
    try {
      if (!result) return;
      if ('error' in result) return setError(result.error);
      const res = await client.api.POST('/v1/payments/verify', { body: result });
      if (!res.data) throw res.error;
      await done();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const s = summary.data;
  if (!s || (!canPay && s.paidPaise === 0)) return null;
  if (s.refundedPaise > 0) {
    return (
      <Card>
        <Row>
          <Title>{t('Payment')}</Title>
          <Badge label={t('Refunded')} tone="success" />
        </Row>
        <Small>
          {t(
            '{amount} is on its way back to the account or card you paid with. Banks usually take 5–7 working days.',
            { amount: rupees(s.refundedPaise) },
          )}
        </Small>
      </Card>
    );
  }
  return (
    <Card>
      <Row>
        <Title>{t('Payment')}</Title>
        <Badge
          label={s.outstandingPaise === 0 ? t('Paid') : s.paidPaise > 0 ? t('Part paid') : t('Due')}
          tone={s.outstandingPaise === 0 ? 'success' : 'warning'}
        />
      </Row>
      <Small>
        {t(
          '{paid} paid of {total}. Your money is held by Setu and released to the professional when you confirm the work is done.',
          { paid: rupees(s.paidPaise), total: rupees(s.agreedTotalPaise) },
        )}
      </Small>
      {paid ? <Notice tone="success">{t('Payment received. Thank you!')}</Notice> : null}
      {error ? <Notice>{error}</Notice> : null}
      {canPay && s.outstandingPaise > 0 ? (
        <Button
          title={t('Pay {amount}', { amount: rupees(s.outstandingPaise) })}
          kind="accent"
          testID="pay"
          loading={busy}
          onPress={start}
        />
      ) : null}
      <RazorpayCheckout
        order={order}
        prefill={{ name: me.data?.name, contact: me.data?.phone }}
        onResult={onResult}
      />
    </Card>
  );
}
