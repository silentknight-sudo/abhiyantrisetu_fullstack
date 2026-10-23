import type { PaymentOrder } from '@setu/api-client';

/** What Razorpay hands back on success; the API verifies the signature. */
export interface CheckoutResult {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface CheckoutPrefill {
  name?: string | null;
  contact?: string;
}

/** Fake-gateway orders (development) are completed by the API instead of Razorpay. */
export const isFakeOrder = (order: PaymentOrder) => order.keyId === 'rzp_test_fake';

/** Razorpay Checkout options shared by the web and native integrations. */
export function checkoutOptions(order: PaymentOrder, prefill: CheckoutPrefill) {
  return {
    key: order.keyId,
    order_id: order.razorpayOrderId,
    amount: order.amountPaise,
    currency: order.currency,
    name: 'Abhiyantri Setu',
    description: 'Job payment (held until you confirm the work)',
    prefill: { name: prefill.name ?? undefined, contact: prefill.contact },
    theme: { color: '#1A3A52' },
  };
}
