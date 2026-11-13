import { LedgerAccounts } from '@setu/domain';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { categories, leads, ledgerEntries, partners, users } from '../src/db/schema';
import { bearer, createTestApp, freshIp, login, type TestContext } from './setup';

let ctx: TestContext;
type Session = Awaited<ReturnType<typeof login>>;
let customer: Session;
let pro: Session;
let partnerId: string;
let jobId: string;
const as = (s: Session) => bearer(s.accessToken);
const JPEG = Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9', 'hex');
const local = (url: string) => url.slice(url.indexOf('/v1/'));

async function photo() {
  const slot = await ctx
    .http()
    .post('/v1/uploads')
    .set(as(pro))
    .send({ purpose: 'job_photo', contentType: 'image/jpeg', sizeBytes: JPEG.length })
    .expect(201);
  await ctx
    .http()
    .put(local(slot.body.upload.url))
    .set(slot.body.upload.headers)
    .send(JPEG)
    .expect(200);
  return slot.body.fileKey as string;
}

async function balance(account: string) {
  const [row] = await ctx.db
    .select({
      n: sql<string>`coalesce(sum(${ledgerEntries.creditPaise} - ${ledgerEntries.debitPaise}), 0)`,
    })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.account, account));
  return Number(row!.n);
}

async function pay(amountPaise?: number) {
  const o = await ctx
    .http()
    .post('/v1/payments/orders')
    .set(as(customer))
    .send({ jobId, ...(amountPaise ? { amountPaise } : {}) })
    .expect(201);
  await ctx
    .http()
    .post('/v1/payments/fake-checkout')
    .set(as(customer))
    .send({ razorpayOrderId: o.body.razorpayOrderId })
    .expect(200);
  return o.body;
}

beforeAll(async () => {
  ctx = await createTestApp();
  const tmp = await login(ctx, '9760000001');
  await ctx.db
    .update(users)
    .set({ roles: ['ops'] })
    .where(eq(users.id, tmp.user.id));
  const ops = await login(ctx, '9760000001');
  customer = await login(ctx, '9760000002');
  pro = await login(ctx, '9760000003');
  const p = await ctx
    .http()
    .post('/v1/partners/me')
    .set(as(pro))
    .send({
      displayName: 'Shree Ganesh Contractors',
      trades: ['painter'],
      baseLocation: { lat: 28.47, lng: 77.51 },
    })
    .expect(201);
  partnerId = p.body.id;
  await ctx
    .http()
    .post(`/v1/admin/partners/${partnerId}/verification`)
    .set(as(ops))
    .send({ status: 'verified' })
    .expect(201);
  const [cat] = await ctx.db
    .insert(categories)
    .values({ slug: 'painting', requirementType: 'service', nameEn: 'Painting', nameHi: 'पेंटिंग' })
    .onConflictDoUpdate({ target: categories.slug, set: { isActive: true } })
    .returning();

  const req = await ctx
    .http()
    .post('/v1/requirements')
    .set(as(customer))
    .set('x-forwarded-for', freshIp())
    .send({
      type: 'service',
      title: '2BHK repaint',
      categoryId: cat!.id,
      address: {
        line1: 'B-1203, Ansal Golf Links',
        sector: 'Sector Pi',
        city: 'Greater Noida',
        pincode: '201310',
        location: { lat: 28.4744, lng: 77.504 },
      },
      details: { description: 'Repaint walls and ceiling of a 2BHK flat' },
    })
    .expect(201);
  const [lead] = await ctx.db.select().from(leads).where(eq(leads.requirementId, req.body.id));
  const quote = await ctx
    .http()
    .post(`/v1/partner/leads/${lead!.id}/quote`)
    .set(as(pro))
    .send({
      items: [{ description: 'Labour and material', quantity: 1, unitPricePaise: 4_200_000 }],
      milestones: [
        { title: 'Surface prep & putty', percent: 30 },
        { title: 'Primer & final coats', percent: 70 },
      ],
    })
    .expect(201);
  const hired = await ctx
    .http()
    .post(`/v1/quotes/${quote.body.id}/accept`)
    .set(as(customer))
    .expect(200);
  jobId = hired.body.job.id;
  await ctx
    .http()
    .post(`/v1/jobs/${jobId}/schedule`)
    .set(as(pro))
    .send({ slotStart: new Date(Date.now() + 86_400_000).toISOString() })
    .expect(200);
  await ctx
    .http()
    .post(`/v1/jobs/${jobId}/start`)
    .set(as(pro))
    .send({ startCode: hired.body.startCode })
    .expect(200);
});

afterAll(async () => {
  await ctx?.app.close();
});

describe('project milestones', () => {
  it('are created from the accepted quote, amounts adding up to the total', async () => {
    const w = await ctx.http().get(`/v1/jobs/${jobId}/work`).set(as(customer)).expect(200);
    expect(
      w.body.milestones.map((m: { title: string; amountPaise: number; status: string }) => [
        m.title,
        m.amountPaise,
        m.status,
      ]),
    ).toEqual([
      ['Surface prep & putty', 1_260_000, 'pending'],
      ['Primer & final coats', 2_940_000, 'pending'],
    ]);
    expect(w.body.paidPaise).toBe(0);
  });

  it('partner marks ready with photos; approval needs funding, then releases that milestone', async () => {
    let w = (await ctx.http().get(`/v1/jobs/${jobId}/work`).set(as(pro)).expect(200)).body;
    const [m1, m2] = w.milestones;
    // Order and photos are enforced.
    const k1 = await photo();
    await ctx
      .http()
      .post(`/v1/jobs/${jobId}/milestones/${m2.id}/ready`)
      .set(as(pro))
      .send({ fileKeys: [k1] })
      .expect(409);
    await ctx
      .http()
      .post(`/v1/jobs/${jobId}/milestones/${m1.id}/ready`)
      .set(as(pro))
      .send({ fileKeys: [] })
      .expect(400);
    await ctx
      .http()
      .post(`/v1/jobs/${jobId}/milestones/${m1.id}/ready`)
      .set(as(customer))
      .send({ fileKeys: [k1] })
      .expect(403);
    w = (
      await ctx
        .http()
        .post(`/v1/jobs/${jobId}/milestones/${m1.id}/ready`)
        .set(as(pro))
        .send({ fileKeys: [k1], note: 'Putty done' })
        .expect(200)
    ).body;
    expect(w.milestones[0]).toMatchObject({ status: 'ready', note: 'Putty done', funded: false });
    expect(w.milestones[0].photoUrls).toHaveLength(1);

    const blocked = await ctx
      .http()
      .post(`/v1/jobs/${jobId}/milestones/${m1.id}/approve`)
      .set(as(customer))
      .expect(409);
    expect(blocked.body.code).toBe('MILESTONE_NOT_FUNDED');

    // Paying more than owed is refused; paying the milestone funds it.
    await ctx
      .http()
      .post('/v1/payments/orders')
      .set(as(customer))
      .send({ jobId, amountPaise: 99_000_000 })
      .expect(400);
    const order = await pay(1_260_000);
    expect(order.amountPaise).toBe(1_260_000);
    expect(await balance(LedgerAccounts.heldForJob(jobId))).toBe(1_260_000);

    await ctx.http().post(`/v1/jobs/${jobId}/milestones/${m1.id}/approve`).set(as(pro)).expect(403);
    w = (
      await ctx
        .http()
        .post(`/v1/jobs/${jobId}/milestones/${m1.id}/approve`)
        .set(as(customer))
        .expect(200)
    ).body;
    expect(w.milestones[0]).toMatchObject({ status: 'approved', funded: true });
    expect(await balance(LedgerAccounts.heldForJob(jobId))).toBe(0);
    expect(await balance(LedgerAccounts.partnerPayable(partnerId))).toBe(1_260_000);
    await ctx
      .http()
      .post(`/v1/jobs/${jobId}/milestones/${m1.id}/approve`)
      .set(as(customer))
      .expect(409);
  });

  it('the customer can ask for fixes; the partner resubmits', async () => {
    let w = (await ctx.http().get(`/v1/jobs/${jobId}/work`).set(as(pro)).expect(200)).body;
    const m2 = w.milestones[1];
    const k = await photo();
    await ctx
      .http()
      .post(`/v1/jobs/${jobId}/milestones/${m2.id}/ready`)
      .set(as(pro))
      .send({ fileKeys: [k] })
      .expect(200);
    await ctx
      .http()
      .post(`/v1/jobs/${jobId}/milestones/${m2.id}/changes`)
      .set(as(customer))
      .send({ note: 'x' })
      .expect(400);
    w = (
      await ctx
        .http()
        .post(`/v1/jobs/${jobId}/milestones/${m2.id}/changes`)
        .set(as(customer))
        .send({ note: 'Patch near the window' })
        .expect(200)
    ).body;
    expect(w.milestones[1]).toMatchObject({
      status: 'changes_requested',
      note: 'Patch near the window',
    });
    const k2 = await photo();
    w = (
      await ctx
        .http()
        .post(`/v1/jobs/${jobId}/milestones/${m2.id}/ready`)
        .set(as(pro))
        .send({ fileKeys: [k2] })
        .expect(200)
    ).body;
    expect(w.milestones[1].status).toBe('ready');

    await pay(); // the rest of the balance
    w = (
      await ctx
        .http()
        .post(`/v1/jobs/${jobId}/milestones/${m2.id}/approve`)
        .set(as(customer))
        .expect(200)
    ).body;
    expect(w.milestones[1].status).toBe('approved');
    expect(await balance(LedgerAccounts.partnerPayable(partnerId))).toBe(4_200_000);
  });
});
