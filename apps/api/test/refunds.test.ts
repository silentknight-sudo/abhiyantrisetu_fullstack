import { createHmac } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { categories, ledgerEntries, partners, payments, users } from '../src/db/schema';
import { JobsService } from '../src/modules/jobs/jobs.service';
import { PAYMENT_GATEWAY, type FakeGateway } from '../src/modules/payments/razorpay.provider';
import { RequirementsService } from '../src/modules/requirements/requirements.service';
import { bearer, createTestApp, login, type TestContext } from './setup';

let ctx: TestContext;
type Session = Awaited<ReturnType<typeof login>>;
let customer: Session;
let partnerUser: Session;
let ops: Session;
let finance: Session;
let partnerId: string;
let categoryId: string;
let gateway: FakeGateway;

const webhookSig = (body: string) =>
  createHmac('sha256', 'test-razorpay-webhook-secret').update(body).digest('hex');

async function staff(phone: string, role: 'ops' | 'finance') {
  const s = await login(ctx, phone);
  await ctx.db
    .update(users)
    .set({ roles: [role] })
    .where(eq(users.id, s.user.id));
  return login(ctx, phone);
}

beforeAll(async () => {
  ctx = await createTestApp();
  gateway = ctx.app.get(PAYMENT_GATEWAY);
  customer = await login(ctx, '9940000001');
  partnerUser = await login(ctx, '9940000002');
  ops = await staff('9940000003', 'ops');
  finance = await staff('9940000004', 'finance');
  await ctx.db
    .update(users)
    .set({ roles: ['customer', 'partner'] })
    .where(eq(users.id, partnerUser.user.id));
  const [p] = await ctx.db
    .insert(partners)
    .values({
      userId: partnerUser.user.id,
      displayName: 'Gupta Carpentry',
      trades: ['carpenter'],
      baseLocation: { lat: 28.47, lng: 77.5 },
      verificationStatus: 'verified',
    })
    .returning();
  partnerId = p!.id;
  const [cat] = await ctx.db
    .insert(categories)
    .values({
      slug: 'carpentry',
      requirementType: 'service',
      nameEn: 'Carpentry',
      nameHi: 'बढ़ईगीरी',
    })
    .returning();
  categoryId = cat!.id;
});

afterAll(async () => {
  await ctx?.app.close();
});

/** A hired job, paid in full. */
async function paidJob(amount: number) {
  const res = await ctx
    .http()
    .post('/v1/requirements')
    .set(bearer(customer.accessToken))
    .send({
      type: 'service',
      title: 'Wardrobe door hinge broken',
      categoryId,
      address: {
        line1: 'C-701, Tower C',
        sector: 'Beta 1',
        city: 'Greater Noida',
        pincode: '201310',
        location: { lat: 28.4705, lng: 77.5015 },
      },
      details: { description: 'Two hinges came off the wardrobe door', urgency: 'this_week' },
    })
    .expect(201);
  const requirements = ctx.app.get(RequirementsService);
  const hired = await ctx.db.transaction(async (tx) => {
    if (res.body.status === 'requested') {
      await requirements.transition(
        tx,
        res.body.id,
        { type: 'match', leadCount: 1 },
        { type: 'system' },
      );
    }
    await requirements.transition(tx, res.body.id, { type: 'receive_quote' }, { type: 'system' });
    return ctx.app.get(JobsService).hire(tx, {
      requirementId: res.body.id,
      partnerId,
      agreedTotalPaise: amount,
      actor: { type: 'customer', id: customer.user.id },
    });
  });
  const order = await ctx
    .http()
    .post('/v1/payments/orders')
    .set(bearer(customer.accessToken))
    .send({ jobId: hired.job.id })
    .expect(201);
  await ctx
    .http()
    .post('/v1/payments/fake-checkout')
    .set(bearer(customer.accessToken))
    .send({ razorpayOrderId: order.body.razorpayOrderId })
    .expect(200);
  return hired;
}

async function held(jobId: string) {
  const [r] = await ctx.db
    .select({
      n: sql<string>`coalesce(sum(${ledgerEntries.creditPaise} - ${ledgerEntries.debitPaise}), 0)`,
    })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.account, `held:job:${jobId}`));
  return Number(r!.n);
}

const cancel = (jobId: string) =>
  ctx
    .http()
    .post(`/v1/jobs/${jobId}/cancel`)
    .set(bearer(customer.accessToken))
    .send({ reason: 'Fixed it myself' })
    .expect(200);

const refundsFor = async (jobId: string) =>
  (
    await ctx.http().get('/v1/admin/refunds').set(bearer(finance.accessToken)).expect(200)
  ).body.filter((r: { jobId: string }) => r.jobId === jobId);

describe('refunds', () => {
  it('refunds the customer automatically when a paid job is cancelled', async () => {
    const { job } = await paidJob(75_000);
    expect(await held(job.id)).toBe(75_000);
    await cancel(job.id);

    expect(await held(job.id)).toBe(0);
    const [refund] = await refundsFor(job.id);
    expect(refund).toMatchObject({
      status: 'processed',
      amountPaise: 75_000,
      reason: 'Job cancelled',
      title: 'Wardrobe door hinge broken',
      customerPhone: '+919940000001',
      attempts: 1,
    });
    expect(refund.razorpayRefundId).toMatch(/^rfnd_fake_/);

    const summary = await ctx
      .http()
      .get(`/v1/jobs/${job.id}/payments`)
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(summary.body).toMatchObject({
      paidPaise: 75_000,
      refundedPaise: 75_000,
      outstandingPaise: 0,
    });
    expect(summary.body.payments[0].status).toBe('refunded');
  });

  it('refunds when ops resolves a dispute as a refund', async () => {
    const { job, startCode } = await paidJob(40_000);
    const asPartner = bearer(partnerUser.accessToken);
    await ctx
      .http()
      .post(`/v1/jobs/${job.id}/schedule`)
      .set(asPartner)
      .send({ slotStart: new Date(Date.now() + 86_400_000).toISOString() })
      .expect(200);
    await ctx
      .http()
      .post(`/v1/jobs/${job.id}/start`)
      .set(asPartner)
      .send({ startCode })
      .expect(200);
    await ctx.http().post(`/v1/jobs/${job.id}/complete`).set(asPartner).expect(200);
    await ctx
      .http()
      .post(`/v1/jobs/${job.id}/dispute`)
      .set(bearer(customer.accessToken))
      .send({ reason: 'Door still falls off' })
      .expect(200);
    await ctx
      .http()
      .post(`/v1/jobs/${job.id}/resolve`)
      .set(bearer(ops.accessToken))
      .send({ outcome: 'refund', note: 'Partner could not fix it' })
      .expect(200);

    const [refund] = await refundsFor(job.id);
    expect(refund).toMatchObject({ status: 'processed', reason: 'Dispute resolved as a refund' });
    expect(await held(job.id)).toBe(0);
  });

  it('keeps a failed refund visible and lets finance retry it, once', async () => {
    const { job } = await paidJob(52_000);
    const original = gateway.refund.bind(gateway);
    gateway.refund = async () => {
      throw new Error('Razorpay 400: The payment has not been captured');
    };
    await cancel(job.id);
    gateway.refund = original;

    const [failed] = await refundsFor(job.id);
    expect(failed).toMatchObject({
      status: 'failed',
      failureReason: 'Razorpay 400: The payment has not been captured',
    });
    expect(await held(job.id)).toBe(52_000); // still held, nothing left the books
    const overview = await ctx
      .http()
      .get('/v1/admin/overview')
      .set(bearer(ops.accessToken))
      .expect(200);
    expect(overview.body.failedRefunds).toBe(1);

    await ctx
      .http()
      .post(`/v1/admin/refunds/${failed.id}/retry`)
      .set(bearer(ops.accessToken))
      .expect(403);
    const retried = await ctx
      .http()
      .post(`/v1/admin/refunds/${failed.id}/retry`)
      .set(bearer(finance.accessToken))
      .expect(200);
    expect(retried.body).toMatchObject({ status: 'processed', attempts: 2, failureReason: null });
    expect(await held(job.id)).toBe(0);
    const again = await ctx
      .http()
      .post(`/v1/admin/refunds/${failed.id}/retry`)
      .set(bearer(finance.accessToken));
    expect(again.status).toBe(409);
  });

  it("follows Razorpay's later word: processed, or failed and held again", async () => {
    const original = gateway.refund.bind(gateway);
    let n = 0;
    gateway.refund = async () => ({ id: `rfnd_pending_${++n}`, status: 'pending' as const });
    const a = await paidJob(30_000);
    const b = await paidJob(20_000);
    await cancel(a.job.id);
    await cancel(b.job.id);
    gateway.refund = original;
    expect((await refundsFor(a.job.id))[0].status).toBe('initiated');

    const send = (event: string, id: string, eventId: string) => {
      const body = JSON.stringify({
        event,
        payload: { refund: { entity: { id, error_description: 'Bank account closed' } } },
      });
      return ctx
        .http()
        .post('/v1/webhooks/razorpay')
        .set('content-type', 'application/json')
        .set('x-razorpay-signature', webhookSig(body))
        .set('x-razorpay-event-id', eventId)
        .send(body)
        .expect(200);
    };
    await send('refund.processed', 'rfnd_pending_1', 'evt_r1');
    expect((await refundsFor(a.job.id))[0].status).toBe('processed');

    await send('refund.failed', 'rfnd_pending_2', 'evt_r2');
    const [bounced] = await refundsFor(b.job.id);
    expect(bounced).toMatchObject({ status: 'failed', failureReason: 'Bank account closed' });
    expect(await held(b.job.id)).toBe(20_000);
    const [p] = await ctx.db.select().from(payments).where(eq(payments.jobId, b.job.id));
    expect(p!.status).toBe('captured');

    const books = await ctx
      .http()
      .get('/v1/admin/ledger/balances')
      .set(bearer(finance.accessToken))
      .expect(200);
    expect(books.body.trialBalancePaise).toBe(0);
  });
});
