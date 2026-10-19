import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { users, waitlistSignups } from '../src/db/schema';
import { bearer, createTestApp, freshIp, login, type TestContext } from './setup';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx?.app.close();
});

const signup = (body: Record<string, unknown>) =>
  ctx.http().post('/v1/waitlist').set('x-forwarded-for', freshIp()).send(body);

const valid = {
  name: 'Rohit Sharma',
  phone: '98765 43210',
  role: 'customer',
  sector: 'Sector Pi',
  interests: ['service', 'renovation'],
  source: 'hero-cta',
  consent: true,
};

describe('waitlist sign-up', () => {
  it('stores a sign-up with a normalised phone and consent time', async () => {
    const res = await signup(valid).expect(200);
    expect(res.body.ok).toBe(true);
    const [row] = await ctx.db
      .select()
      .from(waitlistSignups)
      .where(eq(waitlistSignups.id, res.body.id));
    expect(row).toMatchObject({ phone: '+919876543210', role: 'customer', sector: 'Sector Pi' });
    expect(row!.interests).toEqual(['service', 'renovation']);
    expect(row!.consentedAt).toBeInstanceOf(Date);
  });

  it('updates instead of duplicating the same phone and role', async () => {
    await signup({ ...valid, sector: 'Alpha 1' }).expect(200);
    const rows = await ctx.db
      .select()
      .from(waitlistSignups)
      .where(eq(waitlistSignups.phone, '+919876543210'));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.sector).toBe('Alpha 1');
  });

  it('keeps a separate row when the same person also signs up as a provider', async () => {
    await signup({ ...valid, role: 'provider', trade: 'plumber' }).expect(200);
    const rows = await ctx.db
      .select()
      .from(waitlistSignups)
      .where(eq(waitlistSignups.phone, '+919876543210'));
    expect(rows).toHaveLength(2);
  });

  it('requires consent, a valid phone and a role', async () => {
    await signup({ ...valid, consent: false }).expect(400);
    await signup({ ...valid, phone: '12345' }).expect(400);
    await signup({ ...valid, role: 'investor' }).expect(400);
  });
});

describe('waitlist admin', () => {
  it('is staff-only, lists, summarises and exports CSV', async () => {
    const customer = await login(ctx, '9811100001');
    await ctx.http().get('/v1/admin/waitlist').set(bearer(customer.accessToken)).expect(403);
    await ctx.http().get('/v1/admin/waitlist').expect(401);

    await ctx.db
      .update(users)
      .set({ roles: ['ops'] })
      .where(eq(users.id, customer.user.id));
    const ops = await login(ctx, '9811100001');

    const list = await ctx
      .http()
      .get('/v1/admin/waitlist?role=provider')
      .set(bearer(ops.accessToken))
      .expect(200);
    expect(list.body.total).toBe(1);
    expect(list.body.rows[0].trade).toBe('plumber');

    const summary = await ctx
      .http()
      .get('/v1/admin/waitlist/summary')
      .set(bearer(ops.accessToken))
      .expect(200);
    expect(summary.body.byRole).toEqual(
      expect.arrayContaining([expect.objectContaining({ role: 'customer', n: 1 })]),
    );

    await signup({ ...valid, phone: '9811122222', name: '=HYPERLINK("x")' }).expect(200);
    const csv = await ctx
      .http()
      .get('/v1/admin/waitlist/export.csv')
      .set(bearer(ops.accessToken))
      .expect(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    const lines = csv.text.trim().split('\n');
    expect(lines[0]).toBe('created_at,name,phone,role,sector,trade,interests,source,contacted_at');
    expect(lines).toHaveLength(4);
    // Formula injection is neutralised.
    expect(csv.text).toContain(`"'=HYPERLINK(""x"")"`);
  });
});
