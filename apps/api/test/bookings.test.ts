import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { categories, jobs, leads, partners, services, users } from '../src/db/schema';
import { bearer, createTestApp, login, type TestContext } from './setup';

let ctx: TestContext;
type Session = Awaited<ReturnType<typeof login>>;
let customer: Session;
let ops: Session;
let proA: Session;
let proB: Session;
let catId: string;
let tapId: string;
let flushId: string;

const address = {
  line1: 'C-402, Gaur Saundaryam',
  sector: 'Sector Chi',
  city: 'Greater Noida',
  pincode: '201310',
  location: { lat: 28.4744, lng: 77.504 },
};
const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

async function partner(s: Session, lat: number, lng: number) {
  const res = await ctx
    .http()
    .post('/v1/partners/me')
    .set(bearer(s.accessToken))
    .send({ displayName: 'Pro', trades: ['plumber'], baseLocation: { lat, lng } })
    .expect(201);
  await ctx
    .http()
    .post(`/v1/admin/partners/${res.body.id}/verification`)
    .set(bearer(ops.accessToken))
    .send({ status: 'verified' })
    .expect(201);
}

async function leadFor(s: Session, requirementId: string) {
  const [p] = await ctx.db.select().from(partners).where(eq(partners.userId, s.user.id));
  const all = await ctx.db.select().from(leads).where(eq(leads.requirementId, requirementId));
  return all.find((l) => l.partnerId === p!.id)!;
}

beforeAll(async () => {
  ctx = await createTestApp();
  const tmp = await login(ctx, '9710000001');
  await ctx.db
    .update(users)
    .set({ roles: ['ops'] })
    .where(eq(users.id, tmp.user.id));
  ops = await login(ctx, '9710000001');
  customer = await login(ctx, '9710000002');
  proA = await login(ctx, '9710000003');
  proB = await login(ctx, '9710000004');
  await partner(proA, 28.47, 77.51);
  await partner(proB, 28.48, 77.5);

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
  const rows = await ctx.db
    .insert(services)
    .values([
      {
        categoryId: catId,
        slug: 't-tap',
        nameEn: 'Tap repair',
        nameHi: 'नल',
        unit: 'per tap',
        basePricePaise: 12_900,
        groupEn: 'Tap & mixer',
        durationMinutes: 30,
      },
      {
        categoryId: catId,
        slug: 't-flush',
        nameEn: 'Flush tank repair',
        nameHi: 'फ़्लश',
        unit: 'per toilet',
        basePricePaise: 19_900,
        groupEn: 'Toilet',
        sortOrder: 1,
      },
    ])
    .returning();
  tapId = rows[0]!.id;
  flushId = rows[1]!.id;
});

afterAll(async () => {
  await ctx?.app.close();
});

describe('catalogue', () => {
  it('lists the booking menu for a category, without signing in', async () => {
    const res = await ctx.http().get('/v1/catalog/services?category=plumbing').expect(200);
    const tap = res.body.find((s: { id: string }) => s.id === tapId);
    expect(tap).toMatchObject({ nameEn: 'Tap repair', pricePaise: 12_900, groupEn: 'Tap & mixer' });
    const none = await ctx.http().get('/v1/catalog/services?category=nope').expect(200);
    expect(none.body).toEqual([]);
  });
});

describe('instant booking', () => {
  let requirementId: string;
  const slot = inHours(26);

  it('prices the cart from the catalogue and alerts nearby partners', async () => {
    const res = await ctx
      .http()
      .post('/v1/bookings')
      .set(bearer(customer.accessToken))
      .send({
        categoryId: catId,
        items: [
          { serviceId: tapId, quantity: 2 },
          { serviceId: flushId, quantity: 1 },
        ],
        slotStart: slot,
        address,
        notes: 'Kitchen tap drips',
      })
      .expect(201);
    requirementId = res.body.id;
    expect(res.body.type).toBe('service');
    expect(res.body.details.booking.totalPaise).toBe(2 * 12_900 + 19_900);
    expect(res.body.details.booking.items[0]).toMatchObject({ name: 'Tap repair', quantity: 2 });
    expect(res.body.details.description).toContain('Kitchen tap drips');
    expect(res.body.status).toBe('matched');
  });

  it('rejects bad carts and slots', async () => {
    const base = { categoryId: catId, address, slotStart: slot };
    const post = (body: object) =>
      ctx.http().post('/v1/bookings').set(bearer(customer.accessToken)).send(body);
    await post({ ...base, items: [] }).expect(400);
    await post({
      ...base,
      items: [{ serviceId: tapId, quantity: 1 }],
      slotStart: inHours(-1),
    }).expect(400);
    await post({
      ...base,
      items: [{ serviceId: tapId, quantity: 1 }],
      slotStart: inHours(24 * 30),
    }).expect(400);
    await post({
      ...base,
      items: [
        { serviceId: tapId, quantity: 1 },
        { serviceId: tapId, quantity: 1 },
      ],
    }).expect(400);
    await post({ ...base, items: [{ serviceId: crypto.randomUUID(), quantity: 1 }] }).expect(400);
  });

  it('refuses booking prices smuggled into a plain requirement', async () => {
    await ctx
      .http()
      .post('/v1/requirements')
      .set(bearer(customer.accessToken))
      .send({
        type: 'service',
        title: 'Cheap tap',
        categoryId: catId,
        address,
        details: {
          description: 'Please fix my tap for free',
          booking: {
            items: [{ serviceId: tapId, name: 'Tap', quantity: 1, unitPricePaise: 1 }],
            slotStart: slot,
            totalPaise: 1,
          },
        },
      })
      .expect(400);
  });

  it('hires and schedules the first partner to accept; the second gets 409', async () => {
    const a = await leadFor(proA, requirementId);
    const b = await leadFor(proB, requirementId);
    expect(a && b).toBeTruthy();

    const res = await ctx
      .http()
      .post(`/v1/partner/leads/${a.id}/accept-booking`)
      .set(bearer(proA.accessToken))
      .expect(200);
    expect(res.body.state).toBe('scheduled');
    expect(new Date(res.body.slotStart).toISOString()).toBe(new Date(slot).toISOString());
    const [job] = await ctx.db.select().from(jobs).where(eq(jobs.requirementId, requirementId));
    expect(job!.agreedTotalPaise).toBe(2 * 12_900 + 19_900);

    await ctx
      .http()
      .post(`/v1/partner/leads/${b.id}/accept-booking`)
      .set(bearer(proB.accessToken))
      .expect(409);
    // Someone else's lead is not yours to take.
    await ctx
      .http()
      .post(`/v1/partner/leads/${b.id}/accept-booking`)
      .set(bearer(proA.accessToken))
      .expect(404);
  });

  it('offline partners get no new leads until they come back online', async () => {
    await ctx
      .http()
      .put('/v1/partners/me/availability')
      .set(bearer(proB.accessToken))
      .send({ online: false })
      .expect(200)
      .expect((r) => expect(r.body.isOnline).toBe(false));
    await ctx
      .http()
      .put('/v1/partners/me/availability')
      .set(bearer(customer.accessToken))
      .send({ online: false })
      .expect(403); // customers have no partner profile

    const res = await ctx
      .http()
      .post('/v1/bookings')
      .set(bearer(customer.accessToken))
      .send({
        categoryId: catId,
        items: [{ serviceId: tapId, quantity: 1 }],
        slotStart: inHours(30),
        address,
      })
      .expect(201);
    expect(await leadFor(proA, res.body.id)).toBeTruthy();
    expect(await leadFor(proB, res.body.id)).toBeUndefined();

    await ctx
      .http()
      .put('/v1/partners/me/availability')
      .set(bearer(proB.accessToken))
      .send({ online: true })
      .expect(200);
  });
});
