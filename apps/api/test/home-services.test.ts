import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { categories, leads, partners, services, users } from '../src/db/schema';
import { bearer, createTestApp, freshIp, login, type TestContext } from './setup';

let ctx: TestContext;
type Session = Awaited<ReturnType<typeof login>>;
let customer: Session;
let near: Session;
let far: Session;
let sleepy: Session;
let elec: Session;
let catId: string;
let svcId: string;
const ids: Record<string, string> = {};

const HOME = { lat: 28.4744, lng: 77.504 };
const address = {
  line1: 'E-12, Supertech Eco Village',
  sector: 'Sector Pi',
  city: 'Greater Noida',
  pincode: '201310',
  location: HOME,
};
const as = (s: Session) => bearer(s.accessToken);
const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

async function partner(
  s: Session,
  name: string,
  trades: string[],
  at: { lat: number; lng: number },
  ops: Session,
) {
  const p = await ctx
    .http()
    .post('/v1/partners/me')
    .set(as(s))
    .send({ displayName: name, trades, baseLocation: at, serviceRadiusKm: 10 })
    .expect(201);
  await ctx
    .http()
    .post(`/v1/admin/partners/${p.body.id}/verification`)
    .set(as(ops))
    .send({ status: 'verified' })
    .expect(201);
  return p.body.id as string;
}

const book = (body: object = {}) =>
  ctx
    .http()
    .post('/v1/bookings')
    .set(as(customer))
    .set('x-forwarded-for', freshIp())
    .send({
      categoryId: catId,
      items: [{ serviceId: svcId, quantity: 1 }],
      slotStart: inHours(5),
      address,
      ...body,
    });

async function leadOf(s: Session, requirementId: string) {
  const [p] = await ctx.db.select().from(partners).where(eq(partners.userId, s.user.id));
  return (await ctx.db.select().from(leads).where(eq(leads.requirementId, requirementId))).find(
    (l) => l.partnerId === p!.id,
  );
}

beforeAll(async () => {
  ctx = await createTestApp();
  const tmp = await login(ctx, '9750000001');
  await ctx.db
    .update(users)
    .set({ roles: ['ops'] })
    .where(eq(users.id, tmp.user.id));
  const ops = await login(ctx, '9750000001');
  customer = await login(ctx, '9750000002');
  near = await login(ctx, '9750000003');
  far = await login(ctx, '9750000004');
  sleepy = await login(ctx, '9750000005');
  elec = await login(ctx, '9750000006');
  ids.near = await partner(near, 'Near Plumbing', ['plumber'], { lat: 28.475, lng: 77.505 }, ops);
  ids.far = await partner(far, 'Far Plumbing', ['plumber'], { lat: 28.4595, lng: 77.0266 }, ops);
  ids.sleepy = await partner(
    sleepy,
    'Sleepy Plumbing',
    ['plumber'],
    { lat: 28.48, lng: 77.5 },
    ops,
  );
  ids.elec = await partner(
    elec,
    'Spark Electricals',
    ['electrician'],
    { lat: 28.474, lng: 77.504 },
    ops,
  );
  await ctx
    .http()
    .put('/v1/partners/me/availability')
    .set(as(sleepy))
    .send({ online: false })
    .expect(200);

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
  catId = cat!.id;
  const [svc] = await ctx.db
    .insert(services)
    .values({
      categoryId: catId,
      slug: 'hs-tap',
      nameEn: 'Tap repair',
      nameHi: 'नल',
      unit: 'per tap',
      basePricePaise: 12_900,
    })
    .returning();
  svcId = svc!.id;
});

afterAll(async () => {
  await ctx?.app.close();
});

describe('choose your professional', () => {
  it('lists only verified, online pros in the trade who cover the address', async () => {
    const res = await ctx
      .http()
      .get(`/v1/catalog/pros?category=plumbing&lat=${HOME.lat}&lng=${HOME.lng}`)
      .expect(200);
    expect(res.body.map((p: { displayName: string }) => p.displayName)).toEqual(['Near Plumbing']);
    expect(res.body[0]).toMatchObject({ jobsDone: 0, ratingCount: 0, gstRegistered: false });
    expect(res.body[0].distanceKm).toBeLessThan(1);
  });

  it('a booking with a chosen pro sends the lead to them only; others are refused', async () => {
    const res = await book({ partnerId: ids.near }).expect(201);
    expect(res.body.details.booking.preferredPartnerId).toBe(ids.near);
    expect(await leadOf(near, res.body.id)).toBeTruthy();
    await book({ partnerId: ids.far }).expect(400); // out of range
    await book({ partnerId: ids.sleepy }).expect(400); // offline
    await book({ partnerId: ids.elec }).expect(400); // wrong trade
  });
});

describe('live tracking and reviews', () => {
  it('runs on the way → started → completed → closed, then shows the review in the category', async () => {
    const booked = await book().expect(201);
    const lead = (await leadOf(near, booked.body.id))!;
    const job = await ctx
      .http()
      .post(`/v1/partner/leads/${lead.id}/accept-booking`)
      .set(as(near))
      .expect(200);
    const id = job.body.id as string;
    expect(job.body.onTheWayAt).toBeNull();

    await ctx.http().post(`/v1/jobs/${id}/on-the-way`).set(as(customer)).expect(404);
    const otw = await ctx.http().post(`/v1/jobs/${id}/on-the-way`).set(as(near)).expect(200);
    expect(otw.body.onTheWayAt).toBeTruthy();
    const seen = await ctx.http().get(`/v1/jobs/${id}`).set(as(customer)).expect(200);
    expect(seen.body.onTheWayAt).toBe(otw.body.onTheWayAt);

    const code = await ctx.http().post(`/v1/jobs/${id}/start-code`).set(as(customer)).expect(200);
    await ctx
      .http()
      .post(`/v1/jobs/${id}/start`)
      .set(as(near))
      .send({ startCode: code.body.startCode })
      .expect(200);
    await ctx.http().post(`/v1/jobs/${id}/on-the-way`).set(as(near)).expect(409);
    await ctx.http().post(`/v1/jobs/${id}/complete`).set(as(near)).expect(200);
    await ctx.http().post(`/v1/jobs/${id}/confirm`).set(as(customer)).expect(200);
    await ctx
      .http()
      .post(`/v1/jobs/${id}/review`)
      .set(as(customer))
      .send({ rating: 5, comment: 'Came on time and fixed the tap quickly' })
      .expect(201);

    const r = await ctx.http().get('/v1/catalog/reviews?category=plumbing').expect(200);
    expect(r.body).toMatchObject({ average: 5, total: 1, stars: [1, 0, 0, 0, 0] });
    expect(r.body.reviews[0]).toMatchObject({
      rating: 5,
      sector: 'Sector Pi',
      partnerName: 'Near Plumbing',
    });
    const elsewhere = await ctx
      .http()
      .get('/v1/catalog/reviews?category=plumbing&sector=Alpha%201')
      .expect(200);
    expect(elsewhere.body.reviews).toHaveLength(0);
    await ctx.http().get('/v1/catalog/reviews?category=nope').expect(404);

    // The job now counts for the pro.
    const pros = await ctx
      .http()
      .get(`/v1/catalog/pros?category=plumbing&lat=${HOME.lat}&lng=${HOME.lng}`)
      .expect(200);
    expect(pros.body[0]).toMatchObject({ jobsDone: 1, ratingCount: 1 });
  });
});
