import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auditLog, categories, leads, partners, requirements, users } from '../src/db/schema';
import { bearer, createTestApp, login, type TestContext } from './setup';

let ctx: TestContext;
type Session = Awaited<ReturnType<typeof login>>;
let customer: Session;
let ops: Session;
let nearId: string;
let farId: string;
let reqId: string;
const as = (s: Session) => bearer(s.accessToken);

async function pro(phone: string, name: string, lat: number) {
  const s = await login(ctx, phone);
  const [p] = await ctx.db
    .insert(partners)
    .values({
      userId: s.user.id,
      displayName: name,
      trades: ['electrician'],
      baseLocation: { lat, lng: 77.512 },
      serviceRadiusKm: 10,
      verificationStatus: 'verified',
    })
    .returning();
  return p!.id;
}

beforeAll(async () => {
  ctx = await createTestApp();
  customer = await login(ctx, '9770000001');
  const tmp = await login(ctx, '9770000002');
  await ctx.db
    .update(users)
    .set({ roles: ['ops'] })
    .where(eq(users.id, tmp.user.id));
  ops = await login(ctx, '9770000002');
  nearId = await pro('9770000003', 'Near Electricals', 28.48);
  farId = await pro('9770000004', 'Far Electricals', 28.59); // ~13 km: outside 10 km, inside 15
  const [cat] = await ctx.db
    .insert(categories)
    .values({
      slug: 'electrical',
      requirementType: 'service',
      nameEn: 'Electrical',
      nameHi: 'बिजली',
    })
    .returning();
  const res = await ctx
    .http()
    .post('/v1/requirements')
    .set(as(customer))
    .send({
      type: 'service',
      title: 'Fan not working',
      categoryId: cat!.id,
      address: {
        line1: 'B-402',
        sector: 'Sector  150',
        city: 'Greater Noida',
        pincode: '201310',
        location: { lat: 28.4735, lng: 77.512 },
      },
      details: { description: 'Ceiling fan hums but does not spin', urgency: 'today' },
    })
    .expect(201);
  reqId = res.body.id;
});

afterAll(async () => {
  await ctx?.app.close();
});

describe('matching queue and rescue', () => {
  it('flags a request older than 24 h with under 2 quotes, and rescue reaches further', async () => {
    const before = await ctx.db.select().from(leads).where(eq(leads.requirementId, reqId));
    expect(before.map((l) => l.partnerId)).toEqual([nearId]);
    await ctx.db
      .update(requirements)
      .set({ createdAt: new Date(Date.now() - 25 * 3_600_000) })
      .where(eq(requirements.id, reqId));

    await ctx.http().get('/v1/admin/matching').set(as(customer)).expect(403);
    const q = await ctx.http().get('/v1/admin/matching').set(as(ops)).expect(200);
    const row = q.body.find((r: { id: string }) => r.id === reqId);
    expect(row).toMatchObject({ leadsSent: 1, quotes: 0, atRisk: true, sector: 'Sector  150' });

    const r = await ctx
      .http()
      .post(`/v1/admin/requirements/${reqId}/rescue`)
      .set(as(ops))
      .expect(200);
    expect(r.body.leadsSent).toBe(1);
    const after = await ctx.db.select().from(leads).where(eq(leads.requirementId, reqId));
    expect(after.map((l) => l.partnerId).sort()).toEqual([nearId, farId].sort());
    // Nobody left to ask: a second rescue sends nothing.
    const again = await ctx
      .http()
      .post(`/v1/admin/requirements/${reqId}/rescue`)
      .set(as(ops))
      .expect(200);
    expect(again.body.leadsSent).toBe(0);
    const logs = await ctx.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, 'requirement.rescued'));
    expect(logs).toHaveLength(2);
  });
});

describe('trust & safety reports', () => {
  it('customer reports, a repeat updates the open report, staff resolve with a note', async () => {
    const send = (reason: string) =>
      ctx.http().post('/v1/reports').set(as(customer)).send({ partnerId: nearId, reason });
    await send('asked_cash_outside_app').expect(201);
    await send('rude_or_unsafe').expect(201);
    await ctx
      .http()
      .post('/v1/reports')
      .set(as(customer))
      .send({ partnerId: nearId, reason: 'x' })
      .expect(400);

    const list = await ctx.http().get('/v1/admin/reports?status=open').set(as(ops)).expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({
      reason: 'rude_or_unsafe',
      partnerName: 'Near Electricals',
      openAgainstPartner: 1,
    });
    const id = list.body[0].id;
    await ctx
      .http()
      .post(`/v1/admin/reports/${id}/resolve`)
      .set(as(customer))
      .send({ status: 'dismissed', note: 'n/a' })
      .expect(403);
    const done = await ctx
      .http()
      .post(`/v1/admin/reports/${id}/resolve`)
      .set(as(ops))
      .send({ status: 'actioned', note: 'Called partner, warned' })
      .expect(200);
    expect(done.body).toMatchObject({
      status: 'actioned',
      resolutionNote: 'Called partner, warned',
    });
    await ctx
      .http()
      .post(`/v1/admin/reports/${id}/resolve`)
      .set(as(ops))
      .send({ status: 'dismissed', note: 'again' })
      .expect(400);
  });
});

describe('funnel and pilot sectors', () => {
  it('counts the funnel and supply by trade', async () => {
    const f = await ctx.http().get('/v1/admin/funnel?days=30').set(as(ops)).expect(200);
    expect(f.body.steps[0]).toEqual({ key: 'posted', n: 1 });
    expect(f.body.steps[1]).toEqual({ key: 'matched', n: 1 });
    const el = f.body.supply.find((s: { trade: string }) => s.trade === 'electrician');
    expect(el).toMatchObject({ verifiedPartners: 2, onlinePartners: 2, openRequests: 0 });
  });

  it('sectors: everything is live until configured, then live or waitlist', async () => {
    const cov = (s: string) =>
      ctx
        .http()
        .get(`/v1/catalog/coverage?sector=${encodeURIComponent(s)}`)
        .expect(200);
    expect((await cov('Sector 1')).body.status).toBe('live');
    const set = await ctx
      .http()
      .post('/v1/admin/sectors')
      .set(as(ops))
      .send({ name: ' sector 150 ', status: 'live' })
      .expect(200);
    expect(set.body).toMatchObject({
      name: 'sector 150',
      status: 'live',
      customers: 1,
      openRequests: 1,
    });
    await ctx
      .http()
      .post('/v1/admin/sectors')
      .set(as(ops))
      .send({ name: 'Alpha 2', status: 'waitlist' })
      .expect(200);
    expect((await cov('SECTOR 150')).body.status).toBe('live');
    expect((await cov('alpha 2')).body.status).toBe('waitlist');
    expect((await cov('Omega 9')).body.status).toBe('unknown');
    const all = await ctx.http().get('/v1/admin/sectors').set(as(ops)).expect(200);
    expect(all.body).toHaveLength(2);
  });
});
