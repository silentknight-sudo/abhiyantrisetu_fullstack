import { AUTO_CONFIRM_AFTER_MS } from '@setu/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { categories, jobs, partners, users } from '../src/db/schema';
import { JobsService } from '../src/modules/jobs/jobs.service';
import { RequirementsService } from '../src/modules/requirements/requirements.service';
import { bearer, createTestApp, login, type TestContext } from './setup';

let ctx: TestContext;
let customer: Awaited<ReturnType<typeof login>>;
let partnerUser: Awaited<ReturnType<typeof login>>;
let stranger: Awaited<ReturnType<typeof login>>;
let opsUser: Awaited<ReturnType<typeof login>>;
let partnerId: string;
let plumbingId: string;

const address = {
  line1: 'Tower B, Flat 1203, Ansal Golf Links',
  sector: 'Sector Pi',
  city: 'Greater Noida',
  pincode: '201310',
  location: { lat: 28.4744, lng: 77.504 },
};

beforeAll(async () => {
  ctx = await createTestApp();
  customer = await login(ctx, '9900000001');
  partnerUser = await login(ctx, '9900000002');
  stranger = await login(ctx, '9900000003');
  const tmpOps = await login(ctx, '9900000004');
  await ctx.db
    .update(users)
    .set({ roles: ['ops'] })
    .where(eq(users.id, tmpOps.user.id));
  opsUser = await login(ctx, '9900000004'); // fresh token carrying the ops role

  await ctx.db
    .update(users)
    .set({ roles: ['customer', 'partner'] })
    .where(eq(users.id, partnerUser.user.id));
  const [p] = await ctx.db
    .insert(partners)
    .values({
      userId: partnerUser.user.id,
      displayName: 'Ramesh Plumber',
      trades: ['plumber'],
      baseLocation: { lat: 28.47, lng: 77.5 },
      verificationStatus: 'verified',
    })
    .returning();
  partnerId = p!.id;
  const [cat] = await ctx.db
    .insert(categories)
    .values({
      slug: 'plumbing',
      requirementType: 'service',
      nameEn: 'Plumbing',
      nameHi: 'प्लंबिंग',
    })
    .returning();
  plumbingId = cat!.id;
});

afterAll(async () => {
  await ctx?.app.close();
});

async function postRequirement() {
  const res = await ctx
    .http()
    .post('/v1/requirements')
    .set(bearer(customer.accessToken))
    .send({
      type: 'service',
      title: 'Kitchen tap leaking',
      categoryId: plumbingId,
      address,
      details: { description: 'Kitchen tap has been leaking since this morning', urgency: 'today' },
    })
    .expect(201);
  return res.body as { id: string; status: string };
}

/** Drives a requirement to `quoted` and hires the partner, as the Quotes module will. */
async function hiredJob() {
  const req = await postRequirement();
  const requirements = ctx.app.get(RequirementsService);
  const jobsService = ctx.app.get(JobsService);
  return ctx.db.transaction(async (tx) => {
    await requirements.transition(tx, req.id, { type: 'match', leadCount: 1 }, { type: 'system' });
    await requirements.transition(tx, req.id, { type: 'receive_quote' }, { type: 'system' });
    return jobsService.hire(tx, {
      requirementId: req.id,
      partnerId,
      agreedTotalPaise: 89_900,
      actor: { type: 'customer', id: customer.user.id },
    });
  });
}

const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString();

describe('requirements', () => {
  it('stores a geo-located requirement and its creation event', async () => {
    const req = await postRequirement();
    expect(req.status).toBe('requested');
    const got = await ctx
      .http()
      .get(`/v1/requirements/${req.id}`)
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(got.body.details.urgency).toBe('today');
  });

  it('validates details by type', async () => {
    await ctx
      .http()
      .post('/v1/requirements')
      .set(bearer(customer.accessToken))
      .send({ type: 'equipment', title: 'JCB', address, details: { description: 'x' } })
      .expect(400);
  });

  it('rejects a category of the wrong type', async () => {
    await ctx
      .http()
      .post('/v1/requirements')
      .set(bearer(customer.accessToken))
      .send({
        type: 'consult',
        title: 'Structural check',
        categoryId: plumbingId,
        address,
        details: { topic: 'structural', description: 'Cracks in the living room beam' },
      })
      .expect(400);
  });

  it("hides other people's requirements", async () => {
    const req = await postRequirement();
    await ctx
      .http()
      .get(`/v1/requirements/${req.id}`)
      .set(bearer(stranger.accessToken))
      .expect(404);
  });

  it('can be cancelled before hire', async () => {
    const req = await postRequirement();
    const res = await ctx
      .http()
      .post(`/v1/requirements/${req.id}/cancel`)
      .set(bearer(customer.accessToken))
      .send({ reason: 'Fixed it myself' })
      .expect(200);
    expect(res.body.status).toBe('cancelled');
  });
});

describe('job state machine over HTTP', () => {
  it('runs hired → scheduled → in_progress → completed → closed', async () => {
    const { job, startCode } = await hiredJob();
    const asPartner = bearer(partnerUser.accessToken);
    const asCustomer = bearer(customer.accessToken);

    const view = await ctx.http().get(`/v1/jobs/${job.id}`).set(asPartner).expect(200);
    expect(view.body).toMatchObject({ state: 'hired', viewerRole: 'partner' });
    expect(view.body.startCodeHash).toBeUndefined();

    await ctx
      .http()
      .post(`/v1/jobs/${job.id}/schedule`)
      .set(asCustomer)
      .send({ slotStart: tomorrow() })
      .expect(200);

    // The customer cannot start the job; the partner needs the right code.
    await ctx
      .http()
      .post(`/v1/jobs/${job.id}/start`)
      .set(asCustomer)
      .send({ startCode })
      .expect(403);
    const wrong = startCode === '0000' ? '1111' : '0000';
    const bad = await ctx
      .http()
      .post(`/v1/jobs/${job.id}/start`)
      .set(asPartner)
      .send({ startCode: wrong });
    expect(bad.status).toBe(422);
    const [afterBad] = await ctx.db.select().from(jobs).where(eq(jobs.id, job.id));
    expect(afterBad!.startCodeAttempts).toBe(1); // persisted despite the rejection

    const started = await ctx
      .http()
      .post(`/v1/jobs/${job.id}/start`)
      .set(asPartner)
      .send({ startCode })
      .expect(200);
    expect(started.body.state).toBe('in_progress');
    expect(started.body.startedAt).toBeTruthy();

    // Cancelling after work started is not allowed.
    await ctx
      .http()
      .post(`/v1/jobs/${job.id}/cancel`)
      .set(asCustomer)
      .send({ reason: 'changed mind' })
      .expect(409);

    await ctx.http().post(`/v1/jobs/${job.id}/complete`).set(asPartner).expect(200);
    const closed = await ctx.http().post(`/v1/jobs/${job.id}/confirm`).set(asCustomer).expect(200);
    expect(closed.body.state).toBe('closed');

    const history = await ctx.http().get(`/v1/jobs/${job.id}/events`).set(asCustomer).expect(200);
    expect(history.body.map((e: { event: string }) => e.event)).toEqual([
      'hire',
      'schedule',
      'start',
      'complete',
      'confirm',
    ]);
  });

  it('locks the start code after 5 wrong tries until the customer regenerates it', async () => {
    const { job, startCode } = await hiredJob();
    const asPartner = bearer(partnerUser.accessToken);
    await ctx
      .http()
      .post(`/v1/jobs/${job.id}/schedule`)
      .set(asPartner)
      .send({ slotStart: tomorrow() })
      .expect(200);
    const wrong = startCode === '0000' ? '1111' : '0000';
    for (let i = 0; i < 5; i++) {
      await ctx
        .http()
        .post(`/v1/jobs/${job.id}/start`)
        .set(asPartner)
        .send({ startCode: wrong })
        .expect(422);
    }
    await ctx
      .http()
      .post(`/v1/jobs/${job.id}/start`)
      .set(asPartner)
      .send({ startCode })
      .expect(429);

    await ctx.http().post(`/v1/jobs/${job.id}/start-code`).set(asPartner).expect(404);
    const fresh = await ctx
      .http()
      .post(`/v1/jobs/${job.id}/start-code`)
      .set(bearer(customer.accessToken))
      .expect(200);
    await ctx
      .http()
      .post(`/v1/jobs/${job.id}/start`)
      .set(asPartner)
      .send({ startCode: fresh.body.startCode })
      .expect(200);
  });

  it('hides jobs from unrelated users', async () => {
    const { job } = await hiredJob();
    await ctx.http().get(`/v1/jobs/${job.id}`).set(bearer(stranger.accessToken)).expect(404);
    await ctx
      .http()
      .post(`/v1/jobs/${job.id}/complete`)
      .set(bearer(stranger.accessToken))
      .expect(404);
  });

  it('freezes on dispute; only ops can resolve', async () => {
    const { job, startCode } = await hiredJob();
    const asPartner = bearer(partnerUser.accessToken);
    await ctx
      .http()
      .post(`/v1/jobs/${job.id}/schedule`)
      .set(asPartner)
      .send({ slotStart: tomorrow() })
      .expect(200);
    await ctx
      .http()
      .post(`/v1/jobs/${job.id}/start`)
      .set(asPartner)
      .send({ startCode })
      .expect(200);
    await ctx.http().post(`/v1/jobs/${job.id}/complete`).set(asPartner).expect(200);
    await ctx
      .http()
      .post(`/v1/jobs/${job.id}/dispute`)
      .set(bearer(customer.accessToken))
      .send({ reason: 'Still leaking after the repair' })
      .expect(200);

    const resolve = { outcome: 'refund', note: 'Partner agreed to refund' };
    await ctx
      .http()
      .post(`/v1/jobs/${job.id}/resolve`)
      .set(bearer(customer.accessToken))
      .send(resolve)
      .expect(403);
    const res = await ctx
      .http()
      .post(`/v1/jobs/${job.id}/resolve`)
      .set(bearer(opsUser.accessToken))
      .send(resolve)
      .expect(200);
    expect(res.body).toMatchObject({ state: 'cancelled', viewerRole: 'ops' });
  });

  it('auto-confirms completed jobs after 48 hours', async () => {
    const { job, startCode } = await hiredJob();
    const asPartner = bearer(partnerUser.accessToken);
    await ctx
      .http()
      .post(`/v1/jobs/${job.id}/schedule`)
      .set(asPartner)
      .send({ slotStart: tomorrow() })
      .expect(200);
    await ctx
      .http()
      .post(`/v1/jobs/${job.id}/start`)
      .set(asPartner)
      .send({ startCode })
      .expect(200);
    await ctx.http().post(`/v1/jobs/${job.id}/complete`).set(asPartner).expect(200);

    const jobsService = ctx.app.get(JobsService);
    expect(await jobsService.autoConfirmDue()).not.toContain(job.id);

    const later = new Date(Date.now() + AUTO_CONFIRM_AFTER_MS + 60_000);
    expect(await jobsService.autoConfirmDue(later)).toContain(job.id);
    const [row] = await ctx.db.select().from(jobs).where(eq(jobs.id, job.id));
    expect(row!.state).toBe('closed');
  });

  it('cannot hire twice on one requirement', async () => {
    const { job } = await hiredJob();
    const jobsService = ctx.app.get(JobsService);
    await expect(
      ctx.db.transaction((tx) =>
        jobsService.hire(tx, {
          requirementId: job.requirementId,
          partnerId,
          agreedTotalPaise: 1,
          actor: { type: 'customer', id: customer.user.id },
        }),
      ),
    ).rejects.toThrow(/Cannot 'hire'/);
  });
});
