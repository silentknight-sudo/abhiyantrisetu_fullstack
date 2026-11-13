import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { categories, jobs, leads, partners, services, users } from '../src/db/schema';
import { bearer, createTestApp, freshIp, login, type TestContext } from './setup';

let ctx: TestContext;
type Session = Awaited<ReturnType<typeof login>>;
let customer: Session;
let pro: Session;
let other: Session;
let jobId: string;

const JPEG = Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9', 'hex');
const local = (url: string) => url.slice(url.indexOf('/v1/'));
const address = {
  line1: 'D-801, Mahagun Mywoods',
  sector: 'Sector Mu',
  city: 'Greater Noida',
  pincode: '201310',
  location: { lat: 28.4744, lng: 77.504 },
};

async function photo(s: Session) {
  const slot = await ctx
    .http()
    .post('/v1/uploads')
    .set(bearer(s.accessToken))
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

beforeAll(async () => {
  ctx = await createTestApp();
  const tmp = await login(ctx, '9740000001');
  await ctx.db
    .update(users)
    .set({ roles: ['ops'] })
    .where(eq(users.id, tmp.user.id));
  const ops = await login(ctx, '9740000001');
  customer = await login(ctx, '9740000002');
  pro = await login(ctx, '9740000003');
  other = await login(ctx, '9740000004');
  const p = await ctx
    .http()
    .post('/v1/partners/me')
    .set(bearer(pro.accessToken))
    .send({ displayName: 'Pro', trades: ['plumber'], baseLocation: { lat: 28.47, lng: 77.51 } })
    .expect(201);
  await ctx
    .http()
    .post(`/v1/admin/partners/${p.body.id}/verification`)
    .set(bearer(ops.accessToken))
    .send({ status: 'verified' })
    .expect(201);

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
      slug: 'jw-tap',
      nameEn: 'Tap repair',
      nameHi: 'नल',
      unit: 'per tap',
      basePricePaise: 12_900,
    })
    .returning();

  // Book, accept, then start the job with the customer's code.
  const booked = await ctx
    .http()
    .post('/v1/bookings')
    .set(bearer(customer.accessToken))
    .set('x-forwarded-for', freshIp())
    .send({
      categoryId: cat!.id,
      items: [{ serviceId: svc!.id, quantity: 1 }],
      slotStart: new Date(Date.now() + 3 * 3_600_000).toISOString(),
      address,
    })
    .expect(201);
  const [me] = await ctx.db.select().from(partners).where(eq(partners.userId, pro.user.id));
  const all = await ctx.db.select().from(leads).where(eq(leads.requirementId, booked.body.id));
  const lead = all.find((l) => l.partnerId === me!.id)!;
  const job = await ctx
    .http()
    .post(`/v1/partner/leads/${lead.id}/accept-booking`)
    .set(bearer(pro.accessToken))
    .expect(200);
  jobId = job.body.id;
});

afterAll(async () => {
  await ctx?.app.close();
});

const as = (s: Session) => bearer(s.accessToken);

describe('site photos', () => {
  it('the partner adds before photos once scheduled; strangers cannot see the job', async () => {
    const key = await photo(pro);
    const res = await ctx
      .http()
      .post(`/v1/jobs/${jobId}/photos`)
      .set(as(pro))
      .send({ kind: 'before', fileKeys: [key] })
      .expect(201);
    expect(res.body.photos.before).toHaveLength(1);
    // After photos only once work is under way.
    const k1 = await photo(pro);
    await ctx
      .http()
      .post(`/v1/jobs/${jobId}/photos`)
      .set(as(pro))
      .send({ kind: 'after', fileKeys: [k1] })
      .expect(409);
    // Someone else's upload, and the customer adding photos, are refused.
    const k2 = await photo(customer);
    await ctx
      .http()
      .post(`/v1/jobs/${jobId}/photos`)
      .set(as(pro))
      .send({ kind: 'before', fileKeys: [k2] })
      .expect(400);
    const k3 = await photo(customer);
    await ctx
      .http()
      .post(`/v1/jobs/${jobId}/photos`)
      .set(as(customer))
      .send({ kind: 'before', fileKeys: [k3] })
      .expect(403);
    await ctx.http().get(`/v1/jobs/${jobId}/work`).set(as(other)).expect(404);
    const seen = await ctx.http().get(`/v1/jobs/${jobId}/work`).set(as(customer)).expect(200);
    expect(seen.body.photos.before).toHaveLength(1);
  });
});

describe('extras', () => {
  it('can only be added while work is in progress, by the partner', async () => {
    await ctx
      .http()
      .post(`/v1/jobs/${jobId}/extras`)
      .set(as(pro))
      .send({ description: 'Angle valve', amountPaise: 24_000 })
      .expect(409);
    const code = await ctx
      .http()
      .post(`/v1/jobs/${jobId}/start-code`)
      .set(as(customer))
      .expect(200);
    await ctx
      .http()
      .post(`/v1/jobs/${jobId}/start`)
      .set(as(pro))
      .send({ startCode: code.body.startCode })
      .expect(200);
    await ctx
      .http()
      .post(`/v1/jobs/${jobId}/extras`)
      .set(as(customer))
      .send({ description: 'Angle valve', amountPaise: 24_000 })
      .expect(403);
    await ctx
      .http()
      .post(`/v1/jobs/${jobId}/extras`)
      .set(as(pro))
      .send({ description: 'x', amountPaise: 24_000 })
      .expect(400);
  });

  it('approving raises the amount due; declining does not; each is answered once', async () => {
    await ctx
      .http()
      .post(`/v1/jobs/${jobId}/extras`)
      .set(as(pro))
      .send({ description: 'Angle valve', amountPaise: 24_000 })
      .expect(201);
    const two = await ctx
      .http()
      .post(`/v1/jobs/${jobId}/extras`)
      .set(as(pro))
      .send({ description: 'Extra labour 30 min', amountPaise: 14_900 })
      .expect(201);
    const [valve, labour] = two.body.extras;
    expect(two.body.totalPaise).toBe(12_900);

    await ctx.http().post(`/v1/jobs/${jobId}/extras/${valve.id}/approve`).set(as(pro)).expect(403);
    const approved = await ctx
      .http()
      .post(`/v1/jobs/${jobId}/extras/${valve.id}/approve`)
      .set(as(customer))
      .expect(200);
    expect(approved.body.totalPaise).toBe(12_900 + 24_000);
    await ctx
      .http()
      .post(`/v1/jobs/${jobId}/extras/${valve.id}/decline`)
      .set(as(customer))
      .expect(409);
    const declined = await ctx
      .http()
      .post(`/v1/jobs/${jobId}/extras/${labour.id}/decline`)
      .set(as(customer))
      .expect(200);
    expect(declined.body.totalPaise).toBe(12_900 + 24_000);
    expect(declined.body.extras.map((e: { status: string }) => e.status)).toEqual([
      'approved',
      'declined',
    ]);

    // Payments follow the new total.
    const [job] = await ctx.db.select().from(jobs).where(eq(jobs.id, jobId));
    expect(job!.agreedTotalPaise).toBe(36_900);
    const pay = await ctx.http().get(`/v1/jobs/${jobId}/payments`).set(as(customer)).expect(200);
    expect(pay.body.outstandingPaise).toBe(36_900);
  });

  it('after photos are allowed once the work is in progress', async () => {
    const k4 = await photo(pro);
    const res = await ctx
      .http()
      .post(`/v1/jobs/${jobId}/photos`)
      .set(as(pro))
      .send({ kind: 'after', fileKeys: [k4] })
      .expect(201);
    expect(res.body.photos.after).toHaveLength(1);
  });
});
