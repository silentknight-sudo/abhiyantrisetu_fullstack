import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { categories, users } from '../src/db/schema';
import { bearer, createTestApp, login, type TestContext } from './setup';

let ctx: TestContext;
type Session = Awaited<ReturnType<typeof login>>;
let ops: Session;
let support: Session;
let customer: Session;
let catId: string;
let otherCatId: string;

async function staff(phone: string, roles: string[]) {
  const s = await login(ctx, phone);
  await ctx.db
    .update(users)
    .set({ roles: roles as never })
    .where(eq(users.id, s.user.id));
  return login(ctx, phone);
}

beforeAll(async () => {
  ctx = await createTestApp();
  ops = await staff('9720000001', ['ops']);
  support = await staff('9720000002', ['support']);
  customer = await login(ctx, '9720000003');
  const [a] = await ctx.db
    .insert(categories)
    .values({
      slug: 'm-electrical',
      requirementType: 'service',
      nameEn: 'Electrical',
      nameHi: 'बिजली',
    })
    .returning();
  const [b] = await ctx.db
    .insert(categories)
    .values({
      slug: 'm-architect',
      requirementType: 'consult',
      nameEn: 'Architect',
      nameHi: 'आर्किटेक्ट',
    })
    .returning();
  catId = a!.id;
  otherCatId = b!.id;
});

afterAll(async () => {
  await ctx?.app.close();
});

const fan = {
  slug: 'm-fan-install',
  nameEn: 'Fan installation',
  nameHi: 'पंखा लगाना',
  unit: 'per fan',
  groupEn: 'Fan',
  durationMinutes: 30,
  pricePaise: 19_900,
};

describe('admin catalogue', () => {
  let id: string;

  it('ops creates, edits and hides a service; the public menu follows', async () => {
    const created = await ctx
      .http()
      .post('/v1/admin/services')
      .set(bearer(ops.accessToken))
      .send({ ...fan, categoryId: catId })
      .expect(201);
    id = created.body.id;
    expect(created.body).toMatchObject({
      pricePaise: 19_900,
      isActive: true,
      categorySlug: 'm-electrical',
    });

    await ctx
      .http()
      .patch(`/v1/admin/services/${id}`)
      .set(bearer(ops.accessToken))
      .send({ pricePaise: 22_900, description: 'Hook ready' })
      .expect(200);
    let menu = await ctx.http().get('/v1/catalog/services?category=m-electrical').expect(200);
    expect(menu.body[0]).toMatchObject({ pricePaise: 22_900, description: 'Hook ready' });

    await ctx
      .http()
      .patch(`/v1/admin/services/${id}`)
      .set(bearer(ops.accessToken))
      .send({ isActive: false })
      .expect(200);
    menu = await ctx.http().get('/v1/catalog/services?category=m-electrical').expect(200);
    expect(menu.body).toEqual([]);
    const all = await ctx.http().get('/v1/admin/services').set(bearer(ops.accessToken)).expect(200);
    expect(all.body.find((s: { id: string }) => s.id === id).isActive).toBe(false);
  });

  it('validates input and rejects duplicates and non-service categories', async () => {
    const post = (body: object) =>
      ctx.http().post('/v1/admin/services').set(bearer(ops.accessToken)).send(body);
    await post({ ...fan, categoryId: catId }).expect(409);
    await post({ ...fan, slug: 'Bad Slug!', categoryId: catId }).expect(400);
    await post({ ...fan, slug: 'm-cheap', pricePaise: 5, categoryId: catId }).expect(400);
    await post({ ...fan, slug: 'm-arch', categoryId: otherCatId }).expect(400);
    await ctx
      .http()
      .patch(`/v1/admin/services/${id}`)
      .set(bearer(ops.accessToken))
      .send({})
      .expect(400);
  });

  it('is staff-only and records every change in the audit log', async () => {
    await ctx.http().get('/v1/admin/services').set(bearer(customer.accessToken)).expect(403);
    await ctx.http().get('/v1/admin/services').set(bearer(support.accessToken)).expect(403);
    await ctx
      .http()
      .patch(`/v1/admin/services/${id}`)
      .set(bearer(customer.accessToken))
      .send({ pricePaise: 100 })
      .expect(403);
    const audit = await ctx
      .http()
      .get(`/v1/admin/audit?entityType=service&entityId=${id}`)
      .set(bearer(ops.accessToken))
      .expect(200);
    expect(audit.body.map((a: { action: string }) => a.action)).toEqual([
      'service.update',
      'service.update',
      'service.create',
    ]);
    expect(audit.body[1].before).toMatchObject({ pricePaise: 19_900 });
    expect(audit.body[1].actorPhone).toBe('+919720000001');
  });
});

describe('admin users', () => {
  it('support can search users by phone; customers cannot', async () => {
    const res = await ctx
      .http()
      .get('/v1/admin/users?q=97200 00003')
      .set(bearer(support.accessToken))
      .expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ phone: '+919720000003', status: 'active' });
    await ctx.http().get('/v1/admin/users').set(bearer(customer.accessToken)).expect(403);
  });

  it('suspending ends the session at once and blocks login; reactivating restores it', async () => {
    const victim = await login(ctx, '9720000004');
    await ctx.http().get('/v1/me').set(bearer(victim.accessToken)).expect(200);

    await ctx
      .http()
      .post(`/v1/admin/users/${victim.user.id}/suspend`)
      .set(bearer(support.accessToken))
      .send({ reason: 'Abusive chat' })
      .expect(403); // support cannot suspend
    await ctx
      .http()
      .post(`/v1/admin/users/${victim.user.id}/suspend`)
      .set(bearer(ops.accessToken))
      .send({ reason: 'x' })
      .expect(400); // a reason is required
    const res = await ctx
      .http()
      .post(`/v1/admin/users/${victim.user.id}/suspend`)
      .set(bearer(ops.accessToken))
      .send({ reason: 'Abusive chat' })
      .expect(200);
    expect(res.body.status).toBe('suspended');

    // The unexpired access token stops working immediately, and so does the refresh token.
    await ctx.http().get('/v1/me').set(bearer(victim.accessToken)).expect(401);
    await ctx
      .http()
      .post('/v1/auth/refresh')
      .send({ refreshToken: victim.refreshToken })
      .expect((r) => expect(r.status).toBeGreaterThanOrEqual(400));

    await ctx
      .http()
      .post(`/v1/admin/users/${victim.user.id}/reactivate`)
      .set(bearer(ops.accessToken))
      .send({ reason: 'Appeal accepted' })
      .expect(200);
    await new Promise((r) => setTimeout(r, 1100)); // a token from a later second
    const again = await login(ctx, '9720000004');
    await ctx.http().get('/v1/me').set(bearer(again.accessToken)).expect(200);
  });

  it('staff cannot act on themselves or on other staff unless super admin', async () => {
    await ctx
      .http()
      .post(`/v1/admin/users/${ops.user.id}/suspend`)
      .set(bearer(ops.accessToken))
      .send({ reason: 'testing self' })
      .expect(403);
    await ctx
      .http()
      .post(`/v1/admin/users/${support.user.id}/suspend`)
      .set(bearer(ops.accessToken))
      .send({ reason: 'testing staff' })
      .expect(403);
  });

  it('reset-device lets a partner log in on a new phone', async () => {
    const p = await login(ctx, '9720000005', 'device-phone-A');
    await ctx
      .http()
      .post('/v1/partners/me')
      .set(bearer(p.accessToken))
      .send({
        displayName: 'Pro',
        trades: ['electrician'],
        baseLocation: { lat: 28.47, lng: 77.5 },
      })
      .expect(201);
    await login(ctx, '9720000005', 'device-phone-A'); // binds the device now that they are a partner
    await expect(login(ctx, '9720000005', 'device-phone-B')).rejects.toThrow();

    await ctx
      .http()
      .post(`/v1/admin/users/${p.user.id}/reset-device`)
      .set(bearer(support.accessToken))
      .send({ reason: 'Lost phone, verified on call' })
      .expect(200);
    const fresh = await login(ctx, '9720000005', 'device-phone-B');
    expect(fresh.accessToken).toBeTruthy();
    await ctx
      .http()
      .post(`/v1/admin/users/${p.user.id}/reset-device`)
      .set(bearer(support.accessToken))
      .send({ reason: 'Again' })
      .expect((r) => expect([200, 409]).toContain(r.status));
  });
});
