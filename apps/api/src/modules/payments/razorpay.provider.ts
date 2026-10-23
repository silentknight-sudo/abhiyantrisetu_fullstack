import { randomBytes } from 'node:crypto';

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface PaymentGateway {
  /** Public key the checkout uses; never the secret. */
  readonly keyId: string;
  createOrder(input: {
    amountPaise: number;
    receipt: string;
    notes: Record<string, string>;
  }): Promise<{ id: string }>;
}

/** Razorpay Orders API. Enable auto-capture in the dashboard so payments capture on success. */
export class RazorpayGateway implements PaymentGateway {
  constructor(
    readonly keyId: string,
    private readonly keySecret: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async createOrder(input: {
    amountPaise: number;
    receipt: string;
    notes: Record<string, string>;
  }) {
    const res = await this.fetchImpl('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        amount: input.amountPaise,
        currency: 'INR',
        receipt: input.receipt,
        notes: input.notes,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => ({}))) as {
      id?: string;
      error?: { description?: string };
    };
    if (!res.ok || !body.id)
      throw new Error(`Razorpay ${res.status}: ${body.error?.description ?? 'order failed'}`);
    return { id: body.id };
  }
}

/** Development/test: local order ids. Signatures are still checked with the key secret. */
export class FakeGateway implements PaymentGateway {
  readonly keyId = 'rzp_test_fake';
  async createOrder() {
    return { id: `order_fake_${randomBytes(7).toString('hex')}` };
  }
}
