import { normalizeIndianMobile } from '@setu/domain';
import { createSetuClient, memoryTokenStore, unwrap } from '@setu/api-client';
import { eq } from 'drizzle-orm';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { categories, refreshTokens } from '../src/db/schema';
import { createTestApp, skipOtpCooldown, type TestContext } from './setup';

/** The generated client against the real server: the spec has to match what is sent. */
let ctx: TestContext;
let baseUrl: string;

beforeAll(async () => {
  ctx = await createTestApp();
  await ctx.app.listen(0, '127.0.0.1');
  baseUrl = `http://127.0.0.1:${(ctx.app.getHttpServer().address() as AddressInfo).port}`;
  await ctx.db.insert(categories).values({
    slug: 'plumbing',
    requirementType: 'service',
    nameEn: 'Plumbing',
    nameHi: 'प्लंबिंग',
  });
});

afterAll(async () => {
  await ctx?.app.close();
});

describe('@setu/api-client', () => {
  it('logs in, posts a requirement and survives an access-token refresh', async () => {
    const tokens = memoryTokenStore();
    const client = createSetuClient({ baseUrl, tokens });
    const { api } = client;

    await skipOtpCooldown(ctx);
    const sent = unwrap(await api.POST('/v1/auth/otp/send', { body: { phone: '9920000001' } }));
    expect(sent.expiresInSeconds).toBeGreaterThan(0);
    const code = ctx.sms.lastCodeFor(normalizeIndianMobile('9920000001')!)!;
    const session = await client.login({ phone: '9920000001', code });
    expect(session.user.roles).toEqual(['customer']);

    const me = unwrap(await api.PATCH('/v1/me', { body: { name: 'Asha', locale: 'hi' } }));
    expect(me).toMatchObject({ name: 'Asha', locale: 'hi' });
    expect(new Date(me.createdAt).getTime()).not.toBeNaN();

    const [plumbing] = unwrap(await api.GET('/v1/catalog/categories'));
    const req = unwrap(
      await api.POST('/v1/requirements', {
        body: {
          type: 'service',
          title: 'Geyser not heating',
          categoryId: plumbing!.id,
          address: {
            line1: 'D-12, Alpha 2',
            sector: 'Alpha 2',
            city: 'Greater Noida',
            pincode: '201310',
            location: { lat: 28.47, lng: 77.51 },
          },
          details: { description: 'Geyser trips the MCB when switched on', urgency: 'today' },
        },
      }),
    );
    expect(req).toMatchObject({ type: 'service', status: 'requested', budgetMaxPaise: null });

    // An expired access token is refreshed transparently and the call retried.
    await tokens.set({ accessToken: 'expired', refreshToken: (await tokens.get())!.refreshToken });
    const mine = unwrap(await api.GET('/v1/requirements'));
    expect(mine.map((r) => r.id)).toEqual([req.id]);
    expect((await tokens.get())!.accessToken).not.toBe('expired');

    const jobs = unwrap(await api.GET('/v1/jobs'));
    expect(jobs).toEqual([]);

    await client.logout();
    expect(await tokens.get()).toBeNull();
    const live = await ctx.db.select().from(refreshTokens).where(eq(refreshTokens.userId, me.id));
    expect(live.every((t) => t.revokedAt || t.rotatedAt)).toBe(true);
  });
});
