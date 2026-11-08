import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { S3StorageProvider } from '../src/modules/storage/storage.provider';
import { bearer, createTestApp, freshIp, login, type TestContext } from './setup';

let ctx: TestContext;
type Session = Awaited<ReturnType<typeof login>>;
let customer: Session;

const JPEG = Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9', 'hex');
const local = (url: string) => url.slice(url.indexOf('/v1/'));
const address = {
  line1: 'A-101, Supertech Czar',
  sector: 'Sector Omega 1',
  city: 'Greater Noida',
  pincode: '201310',
  location: { lat: 28.46, lng: 77.52 },
};

beforeAll(async () => {
  ctx = await createTestApp();
  customer = await login(ctx, '9730000001');
});

afterAll(async () => {
  await ctx?.app.close();
});

describe('per-IP limits cannot be dodged with a forged X-Forwarded-For', () => {
  it('only the hop added by our proxy counts', async () => {
    const realIp = freshIp();
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      // The client invents a new address each time; our proxy appends the real one last.
      const res = await ctx
        .http()
        .post('/v1/auth/otp/send')
        .set('x-forwarded-for', `203.0.113.${i + 1}, ${realIp}`)
        .send({ phone: `97310000${String(i).padStart(2, '0')}` });
      statuses.push(res.status);
    }
    // /otp/send allows 5 a minute per IP: the forged left-hand entries change nothing.
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses.slice(5)).toEqual([429, 429]);
  });
});

describe('uploads are bound to the size that was declared', () => {
  it('the local store refuses a body of a different length', async () => {
    const slot = await ctx
      .http()
      .post('/v1/uploads')
      .set(bearer(customer.accessToken))
      .send({ purpose: 'requirement_photo', contentType: 'image/jpeg', sizeBytes: JPEG.length })
      .expect(201);
    const bigger = Buffer.concat([JPEG, Buffer.alloc(4096)]);
    await ctx
      .http()
      .put(local(slot.body.upload.url))
      .set(slot.body.upload.headers)
      .send(bigger)
      .expect(403);
    await ctx
      .http()
      .put(local(slot.body.upload.url))
      .set(slot.body.upload.headers)
      .send(JPEG)
      .expect(200);
  });

  it('S3 links sign Content-Length, so S3 rejects any other size', () => {
    const s3 = new S3StorageProvider('b', 'ap-south-1', 'AKIAEXAMPLE', 'secret');
    const target = s3.presignUpload('u/x/requirement_photo/y.jpg', 'image/jpeg', 600, 1234);
    const url = target.url;
    // Browsers set Content-Length themselves; only Content-Type is for the client to send.
    expect(target.headers).toEqual({ 'Content-Type': 'image/jpeg' });
    expect(new URL(url).searchParams.get('X-Amz-SignedHeaders')).toBe(
      'content-length;content-type;host',
    );
  });
});

describe('one account cannot flood partners with requests', () => {
  it('allows 5 open requests, then asks the customer to close one', async () => {
    const post = () =>
      ctx
        .http()
        .post('/v1/requirements')
        .set(bearer(customer.accessToken))
        .set('x-forwarded-for', freshIp())
        .send({
          type: 'service',
          title: 'Fan not working',
          address,
          details: { description: 'Ceiling fan stopped working this morning' },
        });
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) ids.push((await post().expect(201)).body.id);
    const sixth = await post().expect(429);
    expect(sixth.body.code).toBe('TOO_MANY_OPEN_REQUESTS');

    await ctx
      .http()
      .post(`/v1/requirements/${ids[0]}/cancel`)
      .set(bearer(customer.accessToken))
      .send({ reason: 'Fixed it myself' })
      .expect(200);
    await post().expect(201);
  });
});
