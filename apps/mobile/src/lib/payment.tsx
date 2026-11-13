import type { PaymentOrder } from '@setu/api-client';
import { useState } from 'react';
import { RazorpayCheckout } from '@/components/RazorpayCheckout';
import { $api, client, queryClient } from './api';
import { type CheckoutResult, isFakeOrder } from './checkout';
import { errorMessage } from './errors';

/**
 * Paying for a job: the whole balance, or one milestone's amount. Opens Razorpay (or
 * completes a development order) and refreshes the job's payment views afterwards.
 * Render `checkout` somewhere on the screen.
 */
export function useJobPayment(jobId: string) {
  const me = $api.useQuery('get', '/v1/me');
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  async function done() {
    setPaid(true);
    await queryClient.invalidateQueries({ queryKey: ['get', '/v1/jobs/{id}/payments'] });
    await queryClient.invalidateQueries({ queryKey: ['get', '/v1/jobs/{id}/work'] });
  }

  async function pay(amountPaise?: number) {
    setError(null);
    setPaid(false);
    setBusy(true);
    try {
      const res = await client.api.POST('/v1/payments/orders', {
        body: { jobId, ...(amountPaise ? { amountPaise } : {}) },
      });
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

  const checkout = (
    <RazorpayCheckout
      order={order}
      prefill={{ name: me.data?.name, contact: me.data?.phone }}
      onResult={onResult}
    />
  );
  return { pay, busy, error, paid, checkout };
}
