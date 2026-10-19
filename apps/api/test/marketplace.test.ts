import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auditLog, categories, jobs, leads, partners, users } from '../src/db/schema';
import { bearer, createTestApp, login, type TestContext } from './setup';

let ctx: TestContext;
type Session = Awaited<ReturnType<typeof login>>;
let customer: Session;
let ops: Session;
let plumberA: Session; // near, verified
let plumberB: Session; // near, verified
let farPlumber: Session; // verified but out of range
let unverified: Session; // near, pending
let electrician: Session; // near, wrong trade
let plumbingId: string;

const SECTOR_PI = { lat: 28.4744, lng: 77.504 };
const address = {
  line1: 'B-1203, Ansal Golf Links',
  sector: 'Sector Pi',
  city: 'Greater Noida',
  pincode: '201310',
  location: SECTOR_PI,
};

async function becomePartner(
  s: Session,
  trades: string[],
  loc: { lat: number; lng: number },
  radius = 10,
) {
  const res = await ctx
    .http()
    .post('/v1/partners/me')
    .set(bearer(s.accessToken))
    .send({
      displayName: `Pro ${s.user.id.slice(0, 4)}`,
      trades,
      baseLocation: loc,
      serviceRadiusKm: radius,
    })
    .expect(201);
  return res.body.id as string;
}

async function verify(partnerId: string) {
  await ctx
    .http()
    .post(`/v1/admin/partners/${partnerId}/verification`)
    .set(bearer(ops.accessToken))
    .send({ status: 'verified' })
    .expect(201);
}

const quoteBody = (labour: number, material: number, gst = true) => ({
  items: [
    { description: 'Labour', quantity: 1, unitPricePaise: labour },
    { description: 'Pipes and fittings', quantity: 2, unit: 'set', unitPricePaise: material },
  ],
  gst: gst ? { rate: 18 } : null,
  milestones: [
    { title: 'Advance', percent: 30 },
    { title: 'On completion', percent: 70 },
  ],
  notes: 'Includes 30-day warranty',
});

beforeAll(async () => {
  ctx = await createTestApp();
  const tmp = await login(ctx, '9700000001');
  await ctx.db
    .update(users)
    .set({ roles: ['ops'] })
    .where(eq(users.id, tmp.user.id));
  ops = await login(ctx, '9700000001');
  customer = await login(ctx, '9700000002');
  plumberA = await login(ctx, '9700000003');
  plumberB = await login(ctx, '9700000004');
  farPlumber = await login(ctx, '9700000005');
  unverified = await login(ctx, '9700000006');
  electrician = await login(ctx, '9700000007');

  await verify(await becomePartner(plumberA, ['plumber'], { lat: 28.47, lng: 77.51 }));
  await verify(
    await becomePartner(plumberB, ['plumber', 'waterproofing'], { lat: 28.48, lng: 77.49 }),
  );
  // ~60 km away in Gurugram with a 10 km radius.
  await verify(await becomePartner(farPlumber, ['plumber'], { lat: 28.4595, lng: 77.0266 }));
  await becomePartner(unverified, ['plumber'], { lat: 28.475, lng: 77.505 });
  await verify(await becomePartner(electrician, ['electrician'], { lat: 28.474, lng: 77.504 }));

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

describe('partner onboarding', () => {
  it('adds the partner role and starts pending', async () => {
    const res = await ctx
      .http()
      .get('/v1/partners/me')
      .set(bearer(unverified.accessToken))
      .expect(200);
    expect(res.body.verificationStatus).toBe('pending');
    const [u] = await ctx.db.select().from(users).where(eq(users.id, unverified.user.id));
    expect(u!.roles).toContain('partner');
  });

  it('refuses a second profile and invalid trades', async () => {
    await ctx
      .http()
      .post('/v1/partners/me')
      .set(bearer(unverified.accessToken))
      .send({ displayName: 'Again', trades: ['plumber'], baseLocation: SECTOR_PI })
      .expect(409);
    await ctx
      .http()
      .post('/v1/partners/me')
      .set(bearer(customer.accessToken))
      .send({ displayName: 'Bad', trades: ['astrologer'], baseLocation: SECTOR_PI })
      .expect(400);
  });

  it('verification is staff-only and audited', async () => {
    const [p] = await ctx.db.select().from(partners).where(eq(partners.userId, unverified.user.id));
    await ctx
      .http()
      .post(`/v1/admin/partners/${p!.id}/verification`)
      .set(bearer(customer.accessToken))
      .send({ status: 'verified' })
      .expect(403);
    await ctx
      .http()
      .post(`/v1/admin/partners/${p!.id}/verification`)
      .set(bearer(ops.accessToken))
      .send({ status: 'rejected' })
      .expect(400); // reason required
    const audits = await ctx.db.select().from(auditLog).where(eq(auditLog.entityType, 'partner'));
    expect(audits.length).toBeGreaterThanOrEqual(4);
    expect(audits[0]!.action).toBe('partner.verified');
  });
});

describe('the core loop: post → match → quote → negotiate → hire → start', () => {
  let requirementId: string;
  let quoteA: string;
  let quoteB: string;

  it('matches only verified, in-range partners in the right trade', async () => {
    const res = await ctx
      .http()
      .post('/v1/requirements')
      .set(bearer(customer.accessToken))
      .send({
        type: 'service',
        title: 'Bathroom tap and pipe leaking',
        categoryId: plumbingId,
        address,
        budgetMaxPaise: 300_000,
        details: {
          description: 'Leak under the bathroom sink, water on the floor',
          urgency: 'today',
        },
      })
      .expect(201);
    requirementId = res.body.id;
    expect(res.body.status).toBe('matched');

    const sent = await ctx.db.select().from(leads).where(eq(leads.requirementId, requirementId));
    const partnerUsers = await ctx.db.select().from(partners);
    const got = sent.map((l) => partnerUsers.find((p) => p.id === l.partnerId)!.userId).sort();
    expect(got).toEqual([plumberA.user.id, plumberB.user.id].sort());
  });

  it('shows the lead to the partner without the customer’s address or phone', async () => {
    const res = await ctx
      .http()
      .get('/v1/partner/leads')
      .set(bearer(plumberA.accessToken))
      .expect(200);
    expect(res.body).toHaveLength(1);
    const lead = res.body[0];
    expect(lead.requirement.title).toBe('Bathroom tap and pipe leaking');
    expect(lead.area.sector).toBe('Sector Pi');
    expect(lead.distanceKm).toBeLessThan(3);
    const text = JSON.stringify(lead);
    expect(text).not.toContain('Ansal Golf Links');
    expect(text).not.toContain('9700000002');

    await ctx
      .http()
      .post(`/v1/partner/leads/${lead.id}/seen`)
      .set(bearer(plumberA.accessToken))
      .expect(200);
    // The electrician never got it.
    const other = await ctx
      .http()
      .get('/v1/partner/leads')
      .set(bearer(electrician.accessToken))
      .expect(200);
    expect(other.body).toHaveLength(0);
  });

  it('partners quote with line items and GST; the requirement becomes quoted', async () => {
    const leadA = (await ctx.http().get('/v1/partner/leads').set(bearer(plumberA.accessToken)))
      .body[0].id;
    const leadB = (await ctx.http().get('/v1/partner/leads').set(bearer(plumberB.accessToken)))
      .body[0].id;

    const a = await ctx
      .http()
      .post(`/v1/partner/leads/${leadA}/quote`)
      .set(bearer(plumberA.accessToken))
      .send(quoteBody(80_000, 45_000))
      .expect(201);
    // 80,000 + 2 × 45,000 = 1,70,000 paise; 18% GST = 30,600 → 2,00,600
    expect(a.body).toMatchObject({
      subtotalPaise: 170_000,
      gstPaise: 30_600,
      totalPaise: 200_600,
      status: 'sent',
    });
    quoteA = a.body.id;

    const b = await ctx
      .http()
      .post(`/v1/partner/leads/${leadB}/quote`)
      .set(bearer(plumberB.accessToken))
      .send(quoteBody(70_000, 40_000, false))
      .expect(201);
    expect(b.body.totalPaise).toBe(150_000);
    quoteB = b.body.id;

    await ctx
      .http()
      .post(`/v1/partner/leads/${leadA}/quote`)
      .set(bearer(plumberA.accessToken))
      .send(quoteBody(1, 1))
      .expect(409);
    await ctx
      .http()
      .post(`/v1/partner/leads/${leadA}/quote`)
      .set(bearer(customer.accessToken))
      .send(quoteBody(1, 1))
      .expect(403);

    const req = await ctx
      .http()
      .get(`/v1/requirements/${requirementId}`)
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(req.body.status).toBe('quoted');
    expect(req.body.firstQuoteAt).toBeTruthy();
  });

  it('rejects milestones that do not add up to 100%', async () => {
    const body = { ...quoteBody(1000, 1000), milestones: [{ title: 'Advance', percent: 50 }] };
    await ctx
      .http()
      .post(`/v1/quotes/${quoteA}/revise`)
      .set(bearer(plumberA.accessToken))
      .send(body)
      .expect(400);
  });

  it('customer compares quotes cheapest first, with partner cards', async () => {
    const res = await ctx
      .http()
      .get(`/v1/requirements/${requirementId}/quotes`)
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(res.body.map((q: { id: string }) => q.id)).toEqual([quoteB, quoteA]);
    expect(res.body[1].items).toHaveLength(2);
    expect(res.body[1].partner).toMatchObject({ verificationStatus: 'verified', tier: 'verified' });
    expect(JSON.stringify(res.body)).not.toContain('9700000003');
    // Other partners cannot see a competitor's quote.
    await ctx.http().get(`/v1/quotes/${quoteA}`).set(bearer(plumberB.accessToken)).expect(404);
  });

  it('negotiation round-trip: counter-offer, then a revised quote', async () => {
    await ctx
      .http()
      .post(`/v1/quotes/${quoteA}/negotiate`)
      .set(bearer(customer.accessToken))
      .send({ message: 'Can you do it for less?', targetTotalPaise: 180_000 })
      .expect(201);
    const revised = await ctx
      .http()
      .post(`/v1/quotes/${quoteA}/revise`)
      .set(bearer(plumberA.accessToken))
      .send({ ...quoteBody(65_000, 45_000), message: 'Best price, materials included' })
      .expect(200);
    expect(revised.body).toMatchObject({ version: 2, totalPaise: 182_900 });

    const full = await ctx
      .http()
      .get(`/v1/quotes/${quoteA}`)
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(full.body.thread.map((t: { message: string | null }) => t.message)).toEqual([
      null,
      'Can you do it for less? (counter-offer: ₹1,800)',
      'Best price, materials included',
    ]);
  });

  it('accepting is the hire: job created, competitor rejected, start code returned', async () => {
    await ctx
      .http()
      .post(`/v1/quotes/${quoteA}/accept`)
      .set(bearer(plumberA.accessToken))
      .expect(404);
    const res = await ctx
      .http()
      .post(`/v1/quotes/${quoteA}/accept`)
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(res.body.startCode).toMatch(/^\d{4}$/);
    expect(res.body.job).toMatchObject({
      state: 'hired',
      agreedTotalPaise: 182_900,
      quoteId: quoteA,
    });

    const b = await ctx
      .http()
      .get(`/v1/quotes/${quoteB}`)
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(b.body.status).toBe('rejected');
    await ctx
      .http()
      .post(`/v1/quotes/${quoteB}/accept`)
      .set(bearer(customer.accessToken))
      .expect(409);

    const req = await ctx
      .http()
      .get(`/v1/requirements/${requirementId}`)
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(req.body.status).toBe('hired');

    // The hired partner now runs the job with the existing state machine.
    const jobId = res.body.job.id;
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
    await ctx
      .http()
      .post(`/v1/jobs/${jobId}/schedule`)
      .set(bearer(plumberA.accessToken))
      .send({ slotStart: tomorrow })
      .expect(200);
    const started = await ctx
      .http()
      .post(`/v1/jobs/${jobId}/start`)
      .set(bearer(plumberA.accessToken))
      .send({ startCode: res.body.startCode })
      .expect(200);
    expect(started.body.state).toBe('in_progress');
    const [job] = await ctx.db.select().from(jobs).where(eq(jobs.id, jobId));
    expect(job!.partnerId).toBeTruthy();
  });

  it('a requirement with no nearby pros stays requested', async () => {
    const res = await ctx
      .http()
      .post('/v1/requirements')
      .set(bearer(customer.accessToken))
      .send({
        type: 'equipment',
        title: 'JCB for two days',
        address,
        details: { equipmentType: 'JCB 3DX', durationDays: 2, startDate: '2026-11-02' },
      })
      .expect(201);
    expect(res.body.status).toBe('requested');
  });
});
