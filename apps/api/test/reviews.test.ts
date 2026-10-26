import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { categories, partners, users } from '../src/db/schema';
import { JobsService } from '../src/modules/jobs/jobs.service';
import { RequirementsService } from '../src/modules/requirements/requirements.service';
import { bearer, createTestApp, login, type TestContext } from './setup';

let ctx: TestContext;
type Session = Awaited<ReturnType<typeof login>>;
let customer: Session;
let partnerUser: Session;
let stranger: Session;
let partnerId: string;
let categoryId: string;

beforeAll(async () => {
  ctx = await createTestApp();
  customer = await login(ctx, '9960000001');
  partnerUser = await login(ctx, '9960000002');
  stranger = await login(ctx, '9960000003');
  await ctx.db.update(users).set({ name: 'Ritu Malhotra' }).where(eq(users.id, customer.user.id));
  await ctx.db
    .update(users)
    .set({ roles: ['customer', 'partner'] })
    .where(eq(users.id, partnerUser.user.id));
  const [p] = await ctx.db
    .insert(partners)
    .values({
      userId: partnerUser.user.id,
      displayName: 'Bright Painters',
      trades: ['painter'],
      baseLocation: { lat: 28.47, lng: 77.5 },
      verificationStatus: 'verified',
    })
    .returning();
  partnerId = p!.id;
  const [cat] = await ctx.db
    .insert(categories)
    .values({ slug: 'painting', requirementType: 'service', nameEn: 'Painting', nameHi: 'पेंटिंग' })
    .returning();
  categoryId = cat!.id;
});

afterAll(async () => {
  await ctx?.app.close();
});

/** A hired job; `close` runs it to closed. */
async function job(close: boolean) {
  const res = await ctx
    .http()
    .post('/v1/requirements')
    .set(bearer(customer.accessToken))
    .send({
      type: 'service',
      title: 'Repaint balcony wall',
      categoryId,
      address: {
        line1: 'D-303, Tower D',
        sector: 'Gamma 1',
        city: 'Greater Noida',
        pincode: '201310',
        location: { lat: 28.4595, lng: 77.5065 },
      },
      details: {
        description: 'Peeling paint on the balcony wall, about 80 sq ft',
        urgency: 'this_week',
      },
    })
    .expect(201);
  const requirements = ctx.app.get(RequirementsService);
  const hired = await ctx.db.transaction(async (tx) => {
    if (res.body.status === 'requested') {
      await requirements.transition(
        tx,
        res.body.id,
        { type: 'match', leadCount: 1 },
        { type: 'system' },
      );
    }
    await requirements.transition(tx, res.body.id, { type: 'receive_quote' }, { type: 'system' });
    return ctx.app.get(JobsService).hire(tx, {
      requirementId: res.body.id,
      partnerId,
      agreedTotalPaise: 300_000,
      actor: { type: 'customer', id: customer.user.id },
    });
  });
  if (close) {
    const asPartner = bearer(partnerUser.accessToken);
    const id = hired.job.id;
    await ctx
      .http()
      .post(`/v1/jobs/${id}/schedule`)
      .set(asPartner)
      .send({ slotStart: new Date(Date.now() + 86_400_000).toISOString() })
      .expect(200);
    await ctx
      .http()
      .post(`/v1/jobs/${id}/start`)
      .set(asPartner)
      .send({ startCode: hired.startCode })
      .expect(200);
    await ctx.http().post(`/v1/jobs/${id}/complete`).set(asPartner).expect(200);
    await ctx.http().post(`/v1/jobs/${id}/confirm`).set(bearer(customer.accessToken)).expect(200);
  }
  return hired.job.id;
}

const review = (jobId: string, body: object, who = customer) =>
  ctx.http().post(`/v1/jobs/${jobId}/review`).set(bearer(who.accessToken)).send(body);

describe('reviews', () => {
  it('lets the customer review a closed job once, and updates the partner rating', async () => {
    const open = await job(false);
    expect((await review(open, { rating: 5 })).body.code).toBe('NOT_CLOSED');

    const a = await job(true);
    expect((await review(a, { rating: 6 })).status).toBe(400);
    expect((await review(a, { rating: 5 }, stranger)).status).toBe(404);
    const first = await review(a, { rating: 5, comment: 'Neat work, cleaned up after' });
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ rating: 5, customerFirstName: 'Ritu', partnerReply: null });
    expect(first.body.customerId).toBeUndefined();
    expect((await review(a, { rating: 1 })).body.code).toBe('ALREADY_REVIEWED');

    const b = await job(true);
    await review(b, { rating: 4 }).then((r) => expect(r.status).toBe(201));
    const [p] = await ctx.db.select().from(partners).where(eq(partners.id, partnerId));
    expect(p).toMatchObject({ ratingAvg: '4.50', ratingCount: 2 });

    // Customers comparing quotes see it on the partner card and the review list.
    const list = await ctx
      .http()
      .get(`/v1/partners/${partnerId}/reviews`)
      .set(bearer(stranger.accessToken))
      .expect(200);
    expect(list.body.map((r: { rating: number }) => r.rating)).toEqual([4, 5]);
  });

  it('lets the partner reply once; the job shows its review to both sides', async () => {
    const id = await job(true);
    const created = (await review(id, { rating: 3, comment: 'Came late' })).body;
    await ctx
      .http()
      .post(`/v1/reviews/${created.id}/reply`)
      .set(bearer(stranger.accessToken))
      .send({ reply: 'Hi' })
      .expect(404);
    const replied = await ctx
      .http()
      .post(`/v1/reviews/${created.id}/reply`)
      .set(bearer(partnerUser.accessToken))
      .send({ reply: 'Sorry for the delay, traffic on the expressway.' })
      .expect(200);
    expect(replied.body.partnerReply).toBe('Sorry for the delay, traffic on the expressway.');
    expect(replied.body.repliedAt).toBeTruthy();
    const again = await ctx
      .http()
      .post(`/v1/reviews/${created.id}/reply`)
      .set(bearer(partnerUser.accessToken))
      .send({ reply: 'Again' });
    expect(again.body.code).toBe('ALREADY_REPLIED');

    for (const who of [customer, partnerUser]) {
      const got = await ctx
        .http()
        .get(`/v1/jobs/${id}/review`)
        .set(bearer(who.accessToken))
        .expect(200);
      expect(got.body.review).toMatchObject({ rating: 3, comment: 'Came late' });
    }
    await ctx.http().get(`/v1/jobs/${id}/review`).set(bearer(stranger.accessToken)).expect(404);
    const none = await ctx
      .http()
      .get(`/v1/jobs/${await job(true)}/review`)
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(none.body).toEqual({ review: null });
  });
});
