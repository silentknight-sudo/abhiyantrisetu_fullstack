import { createHmac } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  categories,
  inboundWebhooks,
  ledgerEntries,
  partners,
  payments,
  users,
} from '../src/db/schema';
import { JobsService } from '../src/modules/jobs/jobs.service';
import { RequirementsService } from '../src/modules/requirements/requirements.service';
import { bearer, createTestApp, login, type TestContext } from './setup';

let ctx: TestContext;
type Session = Awaited<ReturnType<typeof login>>;
let customer: Session;
let partnerUser: Session;
let stranger: Session;
let finance: Session;
let partnerId: string;
let plumbingId: string;

const AGREED = 89_900;
const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString();
const checkoutSig = (orderId: string, paymentId: string) =>
  createHmac('sha256', 'test-razorpay-key-secret').update(`${orderId}|${paymentId}`).digest('hex');
const webhookSig = (body: string) =>
  createHmac('sha256', 'test-razorpay-webhook-secret').update(body).digest('hex');

beforeAll(async () => {
  ctx = await createTestApp();
  customer = await login(ctx, '9910000001');
  partnerUser = await login(ctx, '9910000002');
  stranger = await login(ctx, '9910000003');
  const tmp = await login(ctx, '9910000004');
  await ctx.db
    .update(users)
    .set({ roles: ['finance'] })
    .where(eq(users.id, tmp.user.id));
  finance = await login(ctx, '9910000004');

  await ctx.db
    .update(users)
    .set({ roles: ['customer', 'partner'] })
    .where(eq(users.id, partnerUser.user.id));
  const [p] = await ctx.db
    .insert(partners)
    .values({
      userId: partnerUser.user.id,
      displayName: 'Ramesh Plumber',
      trades: ['plumber'],
      baseLocation: { lat: 28.47, lng: 77.5 },
      verificationStatus: 'verified',
    })
    .returning();
  partnerId = p!.id;
  const [cat] = await ctx.db
    .insert(categories)
    .values({
      slug: 'plumbing',
      requirementType: 'service',
      nameEn: 'Plumbing',
      nameHi: 'प्लंबिंग',
    })
    .returning();
  plumbingId = cat!.id;
});

afterAll(async () => {
  await ctx?.app.close();
});

async function hiredJob() {
  const res = await ctx
    .http()
    .post('/v1/requirements')
    .set(bearer(customer.accessToken))
    .send({
      type: 'service',
      title: 'Bathroom fitting',
      categoryId: plumbingId,
      address: {
        line1: 'Tower B, Flat 1203',
        sector: 'Sector Pi',
        city: 'Greater Noida',
        pincode: '201310',
        location: { lat: 28.4744, lng: 77.504 },
      },
      details: { description: 'Replace the shower mixer and two taps', urgency: 'this_week' },
    })
    .expect(201);
  const req = res.body as { id: string; status: string };
  const requirements = ctx.app.get(RequirementsService);
  const jobsService = ctx.app.get(JobsService);
  return ctx.db.transaction(async (tx) => {
    if (req.status === 'requested') {
      await requirements.transition(
        tx,
        req.id,
        { type: 'match', leadCount: 1 },
        { type: 'system' },
      );
    }
    await requirements.transition(tx, req.id, { type: 'receive_quote' }, { type: 'system' });
    return jobsService.hire(tx, {
      requirementId: req.id,
      partnerId,
      agreedTotalPaise: AGREED,
      actor: { type: 'customer', id: customer.user.id },
    });
  });
}

async function closeJob(jobId: string, startCode: string) {
  const asPartner = bearer(partnerUser.accessToken);
  await ctx
    .http()
    .post(`/v1/jobs/${jobId}/schedule`)
    .set(asPartner)
    .send({ slotStart: tomorrow() })
    .expect(200);
  await ctx.http().post(`/v1/jobs/${jobId}/start`).set(asPartner).send({ startCode }).expect(200);
  await ctx.http().post(`/v1/jobs/${jobId}/complete`).set(asPartner).expect(200);
  await ctx.http().post(`/v1/jobs/${jobId}/confirm`).set(bearer(customer.accessToken)).expect(200);
}

const order = async (jobId: string, session = customer) =>
  ctx.http().post('/v1/payments/orders').set(bearer(session.accessToken)).send({ jobId });

async function balance(account: string) {
  const [row] = await ctx.db
    .select({
      n: sql<string>`coalesce(sum(${ledgerEntries.creditPaise} - ${ledgerEntries.debitPaise}), 0)`,
    })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.account, account));
  return Number(row!.n);
}

describe('payments', () => {
  it('takes payment after hire, holds it, and releases it to the partner on close', async () => {
    const { job, startCode } = await hiredJob();

    await order(job.id, stranger).then((r) => expect(r.status).toBe(404));
    const created = await order(job.id);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      amountPaise: AGREED,
      currency: 'INR',
      keyId: 'rzp_test_fake',
    });
    // Asking again reuses the open order instead of creating another one.
    const again = await order(job.id);
    expect(again.body.razorpayOrderId).toBe(created.body.razorpayOrderId);

    const orderId = created.body.razorpayOrderId as string;
    await ctx
      .http()
      .post('/v1/payments/verify')
      .set(bearer(customer.accessToken))
      .send({
        razorpayOrderId: orderId,
        razorpayPaymentId: 'pay_1',
        razorpaySignature: 'f'.repeat(64),
      })
      .expect(400);
    const verified = await ctx
      .http()
      .post('/v1/payments/verify')
      .set(bearer(customer.accessToken))
      .send({
        razorpayOrderId: orderId,
        razorpayPaymentId: 'pay_1',
        razorpaySignature: checkoutSig(orderId, 'pay_1'),
      })
      .expect(200);
    expect(verified.body).toMatchObject({ status: 'captured', amountPaise: AGREED });

    expect(await balance(`held:job:${job.id}`)).toBe(AGREED);
    await order(job.id).then((r) => expect(r.status).toBe(409)); // fully paid

    const summary = await ctx
      .http()
      .get(`/v1/jobs/${job.id}/payments`)
      .set(bearer(partnerUser.accessToken))
      .expect(200);
    expect(summary.body).toMatchObject({
      agreedTotalPaise: AGREED,
      paidPaise: AGREED,
      outstandingPaise: 0,
    });
    await ctx
      .http()
      .get(`/v1/jobs/${job.id}/payments`)
      .set(bearer(stranger.accessToken))
      .expect(404);

    await closeJob(job.id, startCode);
    expect(await balance(`held:job:${job.id}`)).toBe(0);
    expect(await balance(`partner_payable:${partnerId}`)).toBe(AGREED);

    await ctx.http().get('/v1/admin/ledger/balances').set(bearer(customer.accessToken)).expect(403);
    const trial = await ctx
      .http()
      .get('/v1/admin/ledger/balances')
      .set(bearer(finance.accessToken))
      .expect(200);
    expect(trial.body.trialBalancePaise).toBe(0);
  });

  it('refuses to edit or delete ledger entries', async () => {
    await expect(ctx.db.update(ledgerEntries).set({ memo: 'tampered' })).rejects.toThrow();
    await expect(ctx.db.delete(ledgerEntries)).rejects.toThrow();
  });

  it('records webhook captures once and rejects bad signatures', async () => {
    const { job } = await hiredJob();
    const created = await order(job.id);
    const orderId = created.body.razorpayOrderId as string;
    const body = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_wh_1', order_id: orderId, method: 'upi' } } },
    });
    const send = (signature: string, eventId = 'evt_1') =>
      ctx
        .http()
        .post('/v1/webhooks/razorpay')
        .set('content-type', 'application/json')
        .set('x-razorpay-signature', signature)
        .set('x-razorpay-event-id', eventId)
        .send(body);

    expect((await send(webhookSig('{}'))).status).toBe(403);
    expect((await send(webhookSig(body))).body).toEqual({ ok: true });
    expect((await send(webhookSig(body))).body).toEqual({ duplicate: true });
    // A different delivery of the same capture, e.g. the app's verify call, posts nothing new.
    expect((await send(webhookSig(body), 'evt_2')).body).toEqual({ ok: true });

    const [p] = await ctx.db.select().from(payments).where(eq(payments.razorpayOrderId, orderId));
    expect(p).toMatchObject({ status: 'captured', method: 'upi', razorpayPaymentId: 'pay_wh_1' });
    expect(await balance(`held:job:${job.id}`)).toBe(AGREED);
    const hooks = await ctx.db
      .select()
      .from(inboundWebhooks)
      .where(eq(inboundWebhooks.provider, 'razorpay'));
    expect(hooks.every((h) => h.error === null && h.processedAt)).toBe(true);
  });

  it('completes fake-gateway checkouts in development, for the order owner only', async () => {
    const { job } = await hiredJob();
    const created = await order(job.id);
    const orderId = created.body.razorpayOrderId as string;
    await ctx
      .http()
      .post('/v1/payments/fake-checkout')
      .set(bearer(stranger.accessToken))
      .send({ razorpayOrderId: orderId })
      .expect(404);
    const paid = await ctx
      .http()
      .post('/v1/payments/fake-checkout')
      .set(bearer(customer.accessToken))
      .send({ razorpayOrderId: orderId })
      .expect(200);
    expect(paid.body).toMatchObject({ status: 'captured', amountPaise: AGREED });
    expect(await balance(`held:job:${job.id}`)).toBe(AGREED);
  });

  it('marks failed payments without touching the ledger', async () => {
    const { job } = await hiredJob();
    const created = await order(job.id);
    const orderId = created.body.razorpayOrderId as string;
    const body = JSON.stringify({
      event: 'payment.failed',
      payload: {
        payment: { entity: { id: 'pay_f', order_id: orderId, error_description: 'Card declined' } },
      },
    });
    await ctx
      .http()
      .post('/v1/webhooks/razorpay')
      .set('content-type', 'application/json')
      .set('x-razorpay-signature', webhookSig(body))
      .send(body)
      .expect(200);
    const [p] = await ctx.db.select().from(payments).where(eq(payments.razorpayOrderId, orderId));
    expect(p).toMatchObject({ status: 'failed', failureReason: 'Card declined' });
    expect(await balance(`held:job:${job.id}`)).toBe(0);
    // The customer can try again with a fresh order.
    const retry = await order(job.id);
    expect(retry.body.razorpayOrderId).not.toBe(orderId);
  });
});
