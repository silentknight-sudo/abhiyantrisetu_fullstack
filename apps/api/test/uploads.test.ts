import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { categories, partners, users } from '../src/db/schema';
import { bearer, createTestApp, login, type TestContext } from './setup';

let ctx: TestContext;
type Session = Awaited<ReturnType<typeof login>>;
let customer: Session;
let other: Session;
let partnerUser: Session;
let categoryId: string;

const JPEG = Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9', 'hex');
/** The local store's links point at this API; supertest wants the path and query. */
const local = (url: string) => url.slice(url.indexOf('/v1/'));

async function slot(session: Session, body: object = {}) {
  return ctx
    .http()
    .post('/v1/uploads')
    .set(bearer(session.accessToken))
    .send({
      purpose: 'requirement_photo',
      contentType: 'image/jpeg',
      sizeBytes: JPEG.length,
      ...body,
    });
}

async function upload(session: Session) {
  const res = await slot(session);
  expect(res.status).toBe(201);
  await ctx
    .http()
    .put(local(res.body.upload.url))
    .set(res.body.upload.headers)
    .send(JPEG)
    .expect(200);
  return res.body.fileKey as string;
}

beforeAll(async () => {
  ctx = await createTestApp();
  customer = await login(ctx, '9950000001');
  other = await login(ctx, '9950000002');
  partnerUser = await login(ctx, '9950000003');
  await ctx.db
    .update(users)
    .set({ roles: ['customer', 'partner'] })
    .where(eq(users.id, partnerUser.user.id));
  await ctx.db.insert(partners).values({
    userId: partnerUser.user.id,
    displayName: 'Seepage Experts',
    trades: ['waterproofing'],
    baseLocation: { lat: 28.47, lng: 77.5 },
    verificationStatus: 'verified',
  });
  const [cat] = await ctx.db
    .insert(categories)
    .values({
      slug: 'waterproofing',
      requirementType: 'service',
      nameEn: 'Waterproofing',
      nameHi: 'वॉटरप्रूफिंग',
    })
    .returning();
  categoryId = cat!.id;
});

afterAll(async () => {
  await ctx?.app.close();
});

const post = (session: Session, photos: string[]) =>
  ctx
    .http()
    .post('/v1/requirements')
    .set(bearer(session.accessToken))
    .send({
      type: 'service',
      title: 'Seepage on bedroom wall',
      categoryId,
      address: {
        line1: 'A-1104, Tower A',
        sector: 'Sector Pi',
        city: 'Greater Noida',
        pincode: '201310',
        location: { lat: 28.4744, lng: 77.504 },
      },
      details: {
        description: 'Damp patch spreading under the window',
        urgency: 'this_week',
        photos,
      },
    });

describe('photo uploads', () => {
  it('issues a signed slot, stores the photo and serves it back through a signed link', async () => {
    await ctx
      .http()
      .post('/v1/uploads')
      .send({ purpose: 'requirement_photo', contentType: 'image/jpeg', sizeBytes: 10 })
      .expect(401);
    const res = await slot(customer);
    expect(res.status).toBe(201);
    expect(res.body.fileKey).toMatch(
      new RegExp(`^u/${customer.user.id}/requirement_photo/[0-9a-f-]{36}\\.jpg$`),
    );
    expect(res.body.upload).toMatchObject({
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
    });

    // The signature covers the content type and expiry: changing either is refused.
    await ctx
      .http()
      .put(local(res.body.upload.url))
      .set('Content-Type', 'image/png')
      .send(JPEG)
      .expect(403);
    await ctx
      .http()
      .put(local(res.body.upload.url).replace(/exp=\d+/, 'exp=9999999999'))
      .set(res.body.upload.headers)
      .send(JPEG)
      .expect(403);
    await ctx
      .http()
      .put(local(res.body.upload.url))
      .set(res.body.upload.headers)
      .send(JPEG)
      .expect(200);
  });

  it('refuses oversized files and non-images', async () => {
    expect((await slot(customer, { sizeBytes: 11 * 1024 * 1024 })).body.code).toBe('TOO_LARGE');
    expect((await slot(customer, { contentType: 'application/pdf' })).status).toBe(400);
  });

  it('attaches only your own photos to a requirement, and shows them to the matched partner', async () => {
    const mine = await upload(customer);
    const theirs = await upload(other);
    const forged = await post(customer, [theirs]);
    expect(forged.status).toBe(400);
    expect(forged.body.code).toBe('BAD_FILE');

    const created = await post(customer, [mine]);
    expect(created.status).toBe(201);
    expect(created.body.photoUrls).toHaveLength(1);
    const photo = await ctx.http().get(local(created.body.photoUrls[0])).expect(200);
    expect(photo.headers['content-type']).toBe('image/jpeg');
    expect(photo.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(Buffer.compare(photo.body as Buffer, JPEG)).toBe(0);

    const list = await ctx
      .http()
      .get('/v1/requirements')
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(list.body[0].photoUrls).toHaveLength(1);

    const leads = await ctx
      .http()
      .get('/v1/partner/leads')
      .set(bearer(partnerUser.accessToken))
      .expect(200);
    expect(leads.body[0].requirement.photoUrls).toHaveLength(1);
    await ctx.http().get(local(leads.body[0].requirement.photoUrls[0])).expect(200);
  });
});
