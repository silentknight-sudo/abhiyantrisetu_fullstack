import IORedis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RedisThrottlerStorage } from '../src/common/redis-throttler.storage';
import { createTestApp, freshIp, type TestContext } from './setup';

const REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379/15';

describe('RedisThrottlerStorage', () => {
  let redis: IORedis;
  let store: RedisThrottlerStorage;
  beforeAll(async () => {
    redis = new IORedis(REDIS_URL);
    await redis.flushdb();
    store = new RedisThrottlerStorage(redis, 'test:');
  });
  afterAll(async () => {
    await redis.quit();
  });

  it('counts hits in the window, then blocks for the block duration', async () => {
    const hit = () => store.increment('ip-1', 60_000, 3, 1_000, 'default');
    expect((await hit()).totalHits).toBe(1);
    await hit();
    const third = await hit();
    expect(third).toMatchObject({ totalHits: 3, isBlocked: false });
    expect(third.timeToExpire).toBeGreaterThan(55);
    const fourth = await hit();
    expect(fourth).toMatchObject({ isBlocked: true, timeToBlockExpire: 1 });
    // Other keys and throttlers are independent.
    expect((await store.increment('ip-2', 60_000, 3, 1_000, 'default')).totalHits).toBe(1);
    expect((await store.increment('ip-1', 60_000, 3, 1_000, 'burst')).totalHits).toBe(1);
  });

  it('lets hits through again once old hits leave the window', async () => {
    const hit = () => store.increment('ip-3', 300, 2, 300, 'default');
    await hit();
    await hit();
    expect((await hit()).isBlocked).toBe(true);
    await new Promise((r) => setTimeout(r, 350));
    expect((await hit()).isBlocked).toBe(false);
  });

  it('fails open when Redis is unreachable', async () => {
    const down = new IORedis('redis://127.0.0.1:1', {
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false,
      lazyConnect: true,
      retryStrategy: () => null,
    });
    const broken = new RedisThrottlerStorage(down);
    const res = await broken.increment('ip-4', 60_000, 1, 60_000, 'default');
    expect(res).toMatchObject({ isBlocked: false, totalHits: 0 });
    down.disconnect();
  });
});

describe('rate limits across API instances', () => {
  let a: TestContext;
  let b: TestContext;
  const redisUrl = process.env.REDIS_URL;
  beforeAll(async () => {
    process.env.THROTTLE_STORE = 'redis';
    process.env.REDIS_URL = REDIS_URL;
    a = await createTestApp();
    b = await createTestApp();
  });
  afterAll(async () => {
    delete process.env.THROTTLE_STORE;
    if (redisUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = redisUrl;
    await a?.app.close();
    await b?.app.close();
  });

  it('shares one limit between two API tasks behind a load balancer', async () => {
    const ip = freshIp();
    const join = (ctx: TestContext, i: number) =>
      ctx
        .http()
        .post('/v1/waitlist')
        .set('x-forwarded-for', ip)
        .send({
          name: `Tester ${i}`,
          phone: `98111990${String(i).padStart(2, '0')}`,
          role: 'customer',
          consent: true,
        });
    // The waitlist allows 5 sign-ups a minute per IP: 3 on one task, 2 on the other...
    for (const [ctx, i] of [
      [a, 1],
      [b, 2],
      [a, 3],
      [b, 4],
      [a, 5],
    ] as const) {
      expect((await join(ctx, i)).status).toBeLessThan(300);
    }
    // ...and the 6th is refused whichever task it reaches.
    expect((await join(b, 6)).status).toBe(429);
    expect((await join(a, 7)).status).toBe(429);
  });
});
