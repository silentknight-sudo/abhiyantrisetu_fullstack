import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { categories, leads, partners, services, users } from '../src/db/schema';
import { bearer, createTestApp, freshIp, login, type TestContext } from './setup';

let ctx: TestContext;
type Session = Awaited<ReturnType<typeof login>>;
let referrer: Session;
let friend: Session;
let pro: Session;
const as = (s: Session) => bearer(s.accessToken);
const address = {
  line1: 'A-501, Gaur City',
  sector: 'Sector Pi',
  city: 'Greater Noida',
  pincode: '201310',
  location: { lat: 28.4744, lng: 77.504 },
};

beforeAll(async () => {
  ctx = await createTestApp();
  const tmp = await login(ctx, '9770000001');
  await ctx.db
    .update(users)
    .set({ roles: ['ops'] })
    .where(eq(users.id, tmp.user.id));
  const ops = await login(ctx, '9770000001');
  referrer = await login(ctx, '9770000002');
  friend = await login(ctx, '9770000003');
  pro = await login(ctx, '9770000004');
  await ctx.db.update(users).set({ name: 'Rohit Sharma' }).where(eq(users.id, referrer.user.id));
  await ctx.db.update(users).set({ name: 'Neha Gupta' }).where(eq(users.id, friend.user.id));
  const p = await ctx
    .http()
    .post('/v1/partners/me')
    .set(as(pro))
    .send({ displayName: 'Pro', trades: ['plumber'], baseLocation: { lat: 28.47, lng: 77.51 } })
    .expect(201);
  await ctx
    .http()
    .post(`/v1/admin/partners/${p.body.id}/verification`)
    .set(as(ops))
    .send({ status: 'verified' })
    .expect(201);
});

afterAll(async () => {
  await ctx?.app.close();
});

describe('refer and earn', () => {
  it('gives each user a code; a new customer applies a friend’s code once', async () => {
    const mine = await ctx.http().get('/v1/me/referral').set(as(referrer)).expect(200);
    expect(mine.body.code).toMatch(/^ROHIT[A-Z2-9]{4}$/);
    expect(mine.body).toMatchObject({ earnedPaise: 0, canApply: true, referred: [] });
    const again = await ctx.http().get('/v1/me/referral').set(as(referrer)).expect(200);
    expect(again.body.code).toBe(mine.body.code);

    await ctx
      .http()
      .post('/v1/me/referral/apply')
      .set(as(referrer))
      .send({ code: mine.body.code })
      .expect(400);
    await ctx
      .http()
      .post('/v1/me/referral/apply')
      .set(as(friend))
      .send({ code: 'NOPE2345' })
      .expect(404);
    const applied = await ctx
      .http()
      .post('/v1/me/referral/apply')
      .set(as(friend))
      .send({ code: mine.body.code.toLowerCase() })
      .expect(200);
    expect(applied.body.canApply).toBe(false);
    await ctx
      .http()
      .post('/v1/me/referral/apply')
      .set(as(friend))
      .send({ code: mine.body.code })
      .expect(409);

    const list = await ctx.http().get('/v1/me/referral').set(as(referrer)).expect(200);
    expect(list.body.referred).toEqual([
      expect.objectContaining({ firstName: 'Neha', status: 'signed_up' }),
    ]);
  });

  it('rewards both sides when the friend’s first job is completed', async () => {
    const [cat] = await ctx.db
      .insert(categories)
      .values({
        slug: 'plumbing',
        requirementType: 'service',
        nameEn: 'Plumbing',
        nameHi: 'प्लंबिंग',
      })
      .onConflictDoUpdate({ target: categories.slug, set: { isActive: true } })
      .returning();
    const [svc] = await ctx.db
      .insert(services)
      .values({
        categoryId: cat!.id,
        slug: 'gr-tap',
        nameEn: 'Tap repair',
        nameHi: 'नल',
        unit: 'per tap',
        basePricePaise: 12_900,
      })
      .returning();
    const booked = await ctx
      .http()
      .post('/v1/bookings')
      .set(as(friend))
      .set('x-forwarded-for', freshIp())
      .send({
        categoryId: cat!.id,
        items: [{ serviceId: svc!.id, quantity: 1 }],
        slotStart: new Date(Date.now() + 5 * 3_600_000).toISOString(),
        address,
      })
      .expect(201);
    const [me] = await ctx.db.select().from(partners).where(eq(partners.userId, pro.user.id));
    const [lead] = (
      await ctx.db.select().from(leads).where(eq(leads.requirementId, booked.body.id))
    ).filter((l) => l.partnerId === me!.id);
    const job = await ctx
      .http()
      .post(`/v1/partner/leads/${lead!.id}/accept-booking`)
      .set(as(pro))
      .expect(200);
    const id = job.body.id;
    const code = await ctx.http().post(`/v1/jobs/${id}/start-code`).set(as(friend)).expect(200);
    await ctx
      .http()
      .post(`/v1/jobs/${id}/start`)
      .set(as(pro))
      .send({ startCode: code.body.startCode })
      .expect(200);
    await ctx.http().post(`/v1/jobs/${id}/complete`).set(as(pro)).expect(200);
    await ctx.http().post(`/v1/jobs/${id}/confirm`).set(as(friend)).expect(200);

    const r = await ctx.http().get('/v1/me/referral').set(as(referrer)).expect(200);
    expect(r.body.earnedPaise).toBe(25_000);
    expect(r.body.referred[0].status).toBe('first_job_done');
    const f = await ctx.http().get('/v1/me/referral').set(as(friend)).expect(200);
    expect(f.body.earnedPaise).toBe(25_000);
  });
});

describe('care plans', () => {
  it('lists plans, subscribes once per plan, schedules visits and cancels', async () => {
    const plans = await ctx.http().get('/v1/catalog/care-plans').expect(200);
    expect(plans.body.map((p: { key: string }) => p.key)).toContain('ac-care');

    const sub = await ctx
      .http()
      .post('/v1/care-plans')
      .set(as(referrer))
      .send({ planKey: 'home-care', address })
      .expect(201);
    expect(sub.body).toMatchObject({
      planName: 'Home care plan',
      status: 'active',
      pricePaise: 399_900,
    });
    expect(sub.body.visits).toHaveLength(4);
    expect(sub.body.nextVisit).toBe(sub.body.visits[0]);
    await ctx
      .http()
      .post('/v1/care-plans')
      .set(as(referrer))
      .send({ planKey: 'home-care', address })
      .expect(409);
    await ctx
      .http()
      .post('/v1/care-plans')
      .set(as(referrer))
      .send({ planKey: 'gold', address })
      .expect(400);

    await ctx.http().post(`/v1/care-plans/${sub.body.id}/cancel`).set(as(friend)).expect(404);
    const cancelled = await ctx
      .http()
      .post(`/v1/care-plans/${sub.body.id}/cancel`)
      .set(as(referrer))
      .expect(200);
    expect(cancelled.body).toMatchObject({ status: 'cancelled', nextVisit: null });
    const mine = await ctx.http().get('/v1/care-plans').set(as(referrer)).expect(200);
    expect(mine.body).toHaveLength(1);
  });
});
