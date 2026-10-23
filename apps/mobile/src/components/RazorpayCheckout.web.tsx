import type { PaymentOrder } from '@setu/api-client';
import { useEffect } from 'react';
import { type CheckoutPrefill, type CheckoutResult, checkoutOptions } from '@/lib/checkout';

type RazorpayCtor = new (opts: object) => {
  open(): void;
  on(e: string, cb: (x: { error?: { description?: string } }) => void): void;
};

function loadScript(): Promise<RazorpayCtor> {
  const w = globalThis as unknown as { Razorpay?: RazorpayCtor };
  if (w.Razorpay) return Promise.resolve(w.Razorpay);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () =>
      w.Razorpay ? resolve(w.Razorpay) : reject(new Error('Razorpay did not load'));
    s.onerror = () => reject(new Error('Could not load Razorpay. Check your connection.'));
    document.head.appendChild(s);
  });
}

/** Web: Razorpay's own checkout overlay. */
export function RazorpayCheckout({
  order,
  prefill,
  onResult,
}: {
  order: PaymentOrder | null;
  prefill: CheckoutPrefill;
  onResult: (result: CheckoutResult | { error: string } | null) => void;
}) {
  useEffect(() => {
    if (!order) return;
    loadScript()
      .then((Razorpay) => {
        const rzp = new Razorpay({
          ...checkoutOptions(order, prefill),
          handler: (r: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) =>
            onResult({
              razorpayOrderId: r.razorpay_order_id,
              razorpayPaymentId: r.razorpay_payment_id,
              razorpaySignature: r.razorpay_signature,
            }),
          modal: { ondismiss: () => onResult(null) },
        });
        rzp.on('payment.failed', (e) =>
          onResult({ error: e.error?.description ?? 'Payment failed' }),
        );
        rzp.open();
      })
      .catch((err: Error) => onResult({ error: err.message }));
    // Opens once per order.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.razorpayOrderId]);
  return null;
}
