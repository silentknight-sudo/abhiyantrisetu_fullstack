import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auditLog, users } from '../src/db/schema';
import { bearer, createTestApp, login, type TestContext } from './setup';

let ctx: TestContext;
type Session = Awaited<ReturnType<typeof login>>;
let ops: Session;
let pro: Session;
let other: Session;
let partnerId: string;
const as = (s: Session) => bearer(s.accessToken);
const JPEG = Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9', 'hex');
const local = (url: string) => url.slice(url.indexOf('/v1/'));
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);

async function file(s: Session) {
  const slot = await ctx
    .http()
    .post('/v1/uploads')
    .set(as(s))
    .send({ purpose: 'partner_document', contentType: 'image/jpeg', sizeBytes: JPEG.length })
    .expect(201);
  await ctx
    .http()
    .put(local(slot.body.upload.url))
    .set(slot.body.upload.headers)
    .send(JPEG)
    .expect(200);
  return slot.body.fileKey as string;
}
const upload = (s: Session, body: object) =>
  ctx.http().post('/v1/partners/me/documents').set(as(s)).send(body);

beforeAll(async () => {
  ctx = await createTestApp();
  const tmp = await login(ctx, '9780000001');
  await ctx.db
    .update(users)
    .set({ roles: ['verification'] })
    .where(eq(users.id, tmp.user.id));
  ops = await login(ctx, '9780000001');
  pro = await login(ctx, '9780000002');
  other = await login(ctx, '9780000003');
  const p = await ctx
    .http()
    .post('/v1/partners/me')
    .set(as(pro))
    .send({
      displayName: 'Sanjay Plumbing',
      trades: ['plumber'],
      baseLocation: { lat: 28.47, lng: 77.51 },
    })
    .expect(201);
  partnerId = p.body.id;
});

afterAll(async () => {
  await ctx?.app.close();
});

describe('partner documents', () => {
  it('lists what an in-home trade must provide, and accepts uploads', async () => {
    const start = await ctx.http().get('/v1/partners/me/documents').set(as(pro)).expect(200);
    expect(start.body.required).toEqual([
      'aadhaar',
      'pan',
      'selfie',
      'bank_account',
      'police_verification',
    ]);
    expect(start.body.missing).toHaveLength(5);
    expect(start.body.steps).toEqual([
      { key: 'documents', done: false },
      { key: 'review', done: false },
      { key: 'live', done: false },
    ]);

    // Someone else's file, and an already-expired document, are refused.
    const foreign = await file(other);
    await upload(pro, { kind: 'aadhaar', fileKey: foreign }).expect(400);
    const k0 = await file(pro);
    await upload(pro, { kind: 'police_verification', fileKey: k0, expiresOn: inDays(-1) }).expect(
      400,
    );

    for (const kind of ['aadhaar', 'pan', 'selfie', 'bank_account']) {
      const k = await file(pro);
      await upload(pro, { kind, fileKey: k }).expect(201);
    }
    const k5 = await file(pro);
    const done = await upload(pro, {
      kind: 'police_verification',
      fileKey: k5,
      expiresOn: inDays(10),
    }).expect(201);
    expect(done.body.missing).toEqual([]);
    expect(done.body.steps[0]).toEqual({ key: 'documents', done: true });
    const police = done.body.documents.find(
      (d: { kind: string }) => d.kind === 'police_verification',
    );
    expect(police).toMatchObject({ status: 'pending', expiresInDays: 10 });
    expect(police.url).toBeTruthy();
  });

  it('staff review each document; rejection needs a reason; decisions are audited', async () => {
    await ctx.http().get(`/v1/admin/partners/${partnerId}/documents`).set(as(pro)).expect(403);
    const list = await ctx
      .http()
      .get(`/v1/admin/partners/${partnerId}/documents`)
      .set(as(ops))
      .expect(200);
    const docs = list.body.documents as { id: string; kind: string }[];
    const pan = docs.find((d) => d.kind === 'pan')!;
    await ctx
      .http()
      .post(`/v1/admin/documents/${pan.id}/review`)
      .set(as(ops))
      .send({ status: 'rejected' })
      .expect(400);
    const rejected = await ctx
      .http()
      .post(`/v1/admin/documents/${pan.id}/review`)
      .set(as(ops))
      .send({ status: 'rejected', note: 'Photo is blurry' })
      .expect(200);
    expect(rejected.body).toMatchObject({ status: 'rejected', note: 'Photo is blurry' });

    for (const d of docs.filter((x) => x.kind !== 'pan')) {
      await ctx
        .http()
        .post(`/v1/admin/documents/${d.id}/review`)
        .set(as(ops))
        .send({ status: 'approved' })
        .expect(200);
    }
    let mine = await ctx.http().get('/v1/partners/me/documents').set(as(pro)).expect(200);
    expect(mine.body.steps[1]).toEqual({ key: 'review', done: false });

    // Re-uploading the rejected PAN sends it back for review.
    const k = await file(pro);
    mine = await upload(pro, { kind: 'pan', fileKey: k }).expect(201);
    expect(mine.body.documents.find((d: { kind: string }) => d.kind === 'pan')).toMatchObject({
      status: 'pending',
      note: null,
    });
    await ctx
      .http()
      .post(`/v1/admin/documents/${pan.id}/review`)
      .set(as(ops))
      .send({ status: 'approved' })
      .expect(200);
    mine = await ctx.http().get('/v1/partners/me/documents').set(as(pro)).expect(200);
    expect(mine.body.steps[1]).toEqual({ key: 'review', done: true });

    const audit = await ctx.db.select().from(auditLog).where(eq(auditLog.entityId, partnerId));
    expect(audit.map((a) => a.action)).toContain('document.rejected');
  });

  it('shows staff the documents about to expire', async () => {
    const soon = await ctx
      .http()
      .get('/v1/admin/documents/expiring?days=30')
      .set(as(ops))
      .expect(200);
    expect(soon.body).toEqual([
      expect.objectContaining({
        kind: 'police_verification',
        partnerName: 'Sanjay Plumbing',
        expiresInDays: 10,
      }),
    ]);
    const week = await ctx
      .http()
      .get('/v1/admin/documents/expiring?days=7')
      .set(as(ops))
      .expect(200);
    expect(week.body).toEqual([]);
    await ctx.http().get('/v1/admin/documents/expiring').set(as(pro)).expect(403);
  });
});
