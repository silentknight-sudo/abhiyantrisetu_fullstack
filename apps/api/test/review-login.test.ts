import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, freshIp, type TestContext } from './setup';

let ctx: TestContext;

beforeAll(async () => {
  process.env.REVIEW_LOGIN = '+919999900001:482913';
  ctx = await createTestApp();
});
afterAll(async () => {
  delete process.env.REVIEW_LOGIN;
  await ctx?.app.close();
});

describe('store-review login', () => {
  it('signs the review number in with its fixed code and sends no SMS', async () => {
    const ip = freshIp();
    await ctx
      .http()
      .post('/v1/auth/otp/send')
      .set('x-forwarded-for', ip)
      .send({ phone: '9999900001' })
      .expect(200);
    expect(ctx.sms.lastCodeFor('+919999900001')).toBeUndefined();
    const res = await ctx
      .http()
      .post('/v1/auth/otp/verify')
      .set('x-forwarded-for', ip)
      .send({ phone: '9999900001', code: '482913' })
      .expect(200);
    expect(res.body.accessToken).toBeTruthy();
  });

  it('does not accept the fixed code for any other number', async () => {
    const ip = freshIp();
    await ctx
      .http()
      .post('/v1/auth/otp/send')
      .set('x-forwarded-for', ip)
      .send({ phone: '9999900002' })
      .expect(200);
    await ctx
      .http()
      .post('/v1/auth/otp/verify')
      .set('x-forwarded-for', ip)
      .send({ phone: '9999900002', code: '482913' })
      .expect((r) => expect([400, 401]).toContain(r.status));
  });
});
