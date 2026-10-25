import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { categories, partners, users } from '../src/db/schema';
import { JobsService } from '../src/modules/jobs/jobs.service';
import { RequirementsService } from '../src/modules/requirements/requirements.service';
import { bearer, createTestApp, login, type TestContext } from './setup';

let ctx: TestContext;
type Session = Awaited<ReturnType<typeof login>>;
let customer: Session;
let partnerUser: Session;
let ops: Session;
let finance: Session;
let partnerId: string;
let plumbingId: string;

const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString();

async function staff(phone: string, role: 'ops' | 'finance') {
  const s = await login(ctx, phone);
  await ctx.db
    .update(users)
    .set({ roles: [role] })
    .where(eq(users.id, s.user.id));
  return login(ctx, phone); // fresh token carrying the role
}

beforeAll(async () => {
  ctx = await createTestApp();
  customer = await login(ctx, '9930000001');
  partnerUser = await login(ctx, '9930000002');
  ops = await staff('9930000003', 'ops');
  finance = await staff('9930000004', 'finance');
  await ctx.db.update(users).set({ name: 'Asha' }).where(eq(users.id, customer.user.id));
  await ctx.db
    .update(users)
    .set({ roles: ['customer', 'partner'] })
    .where(eq(users.id, partnerUser.user.id));
  const [p] = await ctx.db
    .insert(partners)
    .values({
      userId: partnerUser.user.id,
      displayName: 'Sharma Electricals',
      trades: ['electrician'],
      baseLocation: { lat: 28.47, lng: 77.5 },
      verificationStatus: 'verified',
    })
    .returning();
  partnerId = p!.id;
  await ctx.db.insert(partners).values({
    userId: customer.user.id,
    displayName: 'Waiting Partner',
    trades: ['painter'],
    baseLocation: { lat: 28.47, lng: 77.5 },
  });
  const [cat] = await ctx.db
    .insert(categories)
    .values({
      slug: 'electrical',
      requirementType: 'service',
      nameEn: 'Electrical',
      nameHi: 'बिजली',
    })
    .returning();
  plumbingId = cat!.id;
});

afterAll(async () => {
  await ctx?.app.close();
});

/** A hired job worth `amount`, paid in full through the fake gateway. */
async function paidJob(amount: number) {
  const res = await ctx
    .http()
    .post('/v1/requirements')
    .set(bearer(customer.accessToken))
    .send({
      type: 'service',
      title: 'Fan not working',
      categoryId: plumbingId,
      address: {
        line1: 'B-402, Tower B',
        sector: 'Alpha 1',
        city: 'Greater Noida',
        pincode: '201310',
        location: { lat: 28.4735, lng: 77.512 },
      },
      details: { description: 'Ceiling fan hums but does not spin', urgency: 'today' },
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

async function workDone(jobId: string, startCode: string) {
  const asPartner = bearer(partnerUser.accessToken);
  await ctx
    .http()
    .post(`/v1/jobs/${jobId}/schedule`)
    .set(asPartner)
    .send({ slotStart: tomorrow() })
    .expect(200);
  await ctx.http().post(`/v1/jobs/${jobId}/start`).set(asPartner).send({ startCode }).expect(200);
  await ctx.http().post(`/v1/jobs/${jobId}/complete`).set(asPartner).expect(200);
}

describe('admin', () => {
  it('lists partners with their phone, filtered by status, staff only', async () => {
    await ctx.http().get('/v1/admin/partners').set(bearer(customer.accessToken)).expect(403);
    const pending = await ctx
      .http()
      .get('/v1/admin/partners?status=pending')
      .set(bearer(ops.accessToken))
      .expect(200);
    expect(pending.body).toHaveLength(1);
    expect(pending.body[0]).toMatchObject({
      displayName: 'Waiting Partner',
      phone: '+919930000001',
      ownerName: 'Asha',
    });
    expect(pending.body[0].serviceArea).toBeUndefined();
  });

  it('runs the dispute desk: list disputed jobs with both parties, resolve, money released', async () => {
    const { job, startCode } = await paidJob(120_000);
    await workDone(job.id, startCode);
    await ctx
      .http()
      .post(`/v1/jobs/${job.id}/dispute`)
      .set(bearer(customer.accessToken))
      .send({ reason: 'Fan still makes noise' })
      .expect(200);

    const overview = await ctx
      .http()
      .get('/v1/admin/overview')
      .set(bearer(ops.accessToken))
      .expect(200);
    expect(overview.body).toMatchObject({
      partners: { pending: 1, inReview: 0, verified: 1 },
      disputedJobs: 1,
      heldPaise: 120_000,
      owedToPartnersPaise: 0,
    });

    await ctx.http().get('/v1/admin/jobs').set(bearer(customer.accessToken)).expect(403);
    const disputed = await ctx
      .http()
      .get('/v1/admin/jobs?state=disputed')
      .set(bearer(ops.accessToken))
      .expect(200);
    expect(disputed.body).toHaveLength(1);
    expect(disputed.body[0]).toMatchObject({
      id: job.id,
      title: 'Fan not working',
      customerName: 'Asha',
      customerPhone: '+919930000001',
      partnerName: 'Sharma Electricals',
      partnerPhone: '+919930000002',
    });
    expect(disputed.body[0].startCodeHash).toBeUndefined();

    await ctx
      .http()
      .post(`/v1/jobs/${job.id}/resolve`)
      .set(bearer(ops.accessToken))
      .send({ outcome: 'release', note: 'Noise is normal for this model' })
      .expect(200);
    const after = await ctx
      .http()
      .get('/v1/admin/overview')
      .set(bearer(ops.accessToken))
      .expect(200);
    expect(after.body).toMatchObject({
      disputedJobs: 0,
      heldPaise: 0,
      owedToPartnersPaise: 120_000,
    });
  });

  it('records payouts against what a partner is owed, never more, finance only', async () => {
    const due = await ctx
      .http()
      .get('/v1/admin/payouts')
      .set(bearer(finance.accessToken))
      .expect(200);
    expect(due.body).toEqual([
      { partnerId, displayName: 'Sharma Electricals', phone: '+919930000002', owedPaise: 120_000 },
    ]);

    const pay = (amountPaise: number, who = finance) =>
      ctx
        .http()
        .post('/v1/admin/payouts')
        .set(bearer(who.accessToken))
        .send({ partnerId, amountPaise, reference: 'UTR 4521 8890' });
    expect((await pay(50_000, ops)).status).toBe(403);
    const over = await pay(500_000);
    expect(over.status).toBe(409);
    expect(over.body.code).toBe('MORE_THAN_OWED');

    const paid = await pay(100_000);
    expect(paid.status).toBe(201);
    expect(paid.body).toEqual({ partnerId, paidPaise: 100_000, owedPaise: 20_000 });
    await pay(20_000).then((r) => expect(r.status).toBe(201));
    const none = await ctx
      .http()
      .get('/v1/admin/payouts')
      .set(bearer(finance.accessToken))
      .expect(200);
    expect(none.body).toEqual([]);

    const books = await ctx
      .http()
      .get('/v1/admin/ledger/balances')
      .set(bearer(finance.accessToken))
      .expect(200);
    expect(books.body.trialBalancePaise).toBe(0);
  });
});
