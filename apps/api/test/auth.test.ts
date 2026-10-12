import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { otpChallenges, users } from '../src/db/schema';
import { bearer, createTestApp, freshIp, login, type TestContext } from './setup';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx?.app.close();
});

const sendOtp = (phone: string, ip = freshIp()) =>
  ctx.http().post('/v1/auth/otp/send').set('x-forwarded-for', ip).send({ phone });
const verifyOtp = (phone: string, code: string, ip = freshIp()) =>
  ctx.http().post('/v1/auth/otp/verify').set('x-forwarded-for', ip).send({ phone, code });

describe('OTP login', () => {
  it('creates a user on first login and reuses it after', async () => {
    const first = await login(ctx, '9811111111');
    expect(first.user.isNew).toBe(true);
    expect(first.user.roles).toEqual(['customer']);

    const again = await login(ctx, '98111 11111');
    expect(again.user.isNew).toBe(false);
    expect(again.user.id).toBe(first.user.id);

    const me = await ctx.http().get('/v1/me').set(bearer(first.accessToken)).expect(200);
    expect(me.body.phone).toBe('+919811111111');
  });

  it('never stores the code in plaintext', async () => {
    await sendOtp('9811111112').expect(200);
    const code = ctx.sms.lastCodeFor('+919811111112')!;
    const [row] = await ctx.db
      .select()
      .from(otpChallenges)
      .where(eq(otpChallenges.phone, '+919811111112'));
    expect(row!.codeHash).toHaveLength(64);
    expect(row!.codeHash).not.toContain(code);
  });

  it('rejects invalid numbers', async () => {
    await sendOtp('12345').expect(400);
  });

  it('enforces the resend cooldown', async () => {
    await sendOtp('9811111113').expect(200);
    const res = await sendOtp('9811111113');
    expect(res.status).toBe(429);
    expect(res.body.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('locks the challenge after 5 wrong attempts', async () => {
    const phone = '9811111114';
    await sendOtp(phone).expect(200);
    const code = ctx.sms.lastCodeFor('+919811111114')!;
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) await verifyOtp(phone, wrong).expect(400);
    // Even the right code is refused now.
    await verifyOtp(phone, code).expect(429);
  });

  it('rejects reuse of a consumed code', async () => {
    const phone = '9811111115';
    await sendOtp(phone).expect(200);
    const code = ctx.sms.lastCodeFor('+919811111115')!;
    await verifyOtp(phone, code).expect(200);
    await verifyOtp(phone, code).expect(400);
  });

  it('requires auth on protected routes', async () => {
    await ctx.http().get('/v1/me').expect(401);
    await ctx.http().get('/v1/me').set(bearer('nope')).expect(401);
  });
});

describe('refresh tokens', () => {
  it('rotates, and revokes the family when a rotated token is replayed', async () => {
    const { refreshToken } = await login(ctx, '9822222221');
    const r1 = await ctx.http().post('/v1/auth/refresh').send({ refreshToken }).expect(200);
    expect(r1.body.refreshToken).not.toBe(refreshToken);

    // Replaying the old token is a theft signal: the whole family is revoked.
    await ctx.http().post('/v1/auth/refresh').send({ refreshToken }).expect(401);
    await ctx
      .http()
      .post('/v1/auth/refresh')
      .send({ refreshToken: r1.body.refreshToken })
      .expect(401);
  });

  it('logout revokes the session', async () => {
    const { refreshToken } = await login(ctx, '9822222222');
    await ctx.http().post('/v1/auth/logout').send({ refreshToken }).expect(204);
    await ctx.http().post('/v1/auth/refresh').send({ refreshToken }).expect(401);
  });
});

describe('partner device binding', () => {
  it('binds a partner to the first device it verifies on', async () => {
    const first = await login(ctx, '9833333331', 'device-aaaa-1111');
    await ctx.db
      .update(users)
      .set({ roles: ['customer', 'partner'] })
      .where(eq(users.id, first.user.id));
    await login(ctx, '9833333331', 'device-aaaa-1111'); // binds this device

    await expect(login(ctx, '9833333331', 'device-bbbb-2222')).rejects.toThrow(/403/);
    await login(ctx, '9833333331', 'device-aaaa-1111');
  });
});

describe('account deletion', () => {
  it('anonymises the user and frees the phone number', async () => {
    const { accessToken, refreshToken, user } = await login(ctx, '9844444441');
    await ctx
      .http()
      .patch('/v1/me')
      .set(bearer(accessToken))
      .send({ name: 'Rohit', consentVersion: '2026-10' })
      .expect(200);
    await ctx.http().delete('/v1/me').set(bearer(accessToken)).expect(204);

    const [row] = await ctx.db.select().from(users).where(eq(users.id, user.id));
    expect(row).toMatchObject({ status: 'deleted', phone: `deleted:${user.id}`, name: null });
    await ctx.http().post('/v1/auth/refresh').send({ refreshToken }).expect(401);

    const fresh = await login(ctx, '9844444441');
    expect(fresh.user.isNew).toBe(true);
  });
});
