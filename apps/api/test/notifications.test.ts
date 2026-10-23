import { createHmac } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  categories,
  inboundWebhooks,
  leads,
  notifications,
  partners,
  users,
} from '../src/db/schema';
import {
  PUSH_PROVIDER,
  type ConsolePushProvider,
} from '../src/modules/notifications/providers/push.provider';
import {
  WHATSAPP_PROVIDER,
  type ConsoleWhatsAppProvider,
} from '../src/modules/notifications/providers/whatsapp.provider';
import { bearer, createTestApp, login, type TestContext } from './setup';

let ctx: TestContext;
type Session = Awaited<ReturnType<typeof login>>;
let customer: Session;
let plumber: Session;
let plumberPhone: string;
let wa: ConsoleWhatsAppProvider;
let push: ConsolePushProvider;
let plumbingId: string;

const SECTOR_PI = { lat: 28.4744, lng: 77.504 };
const PUSH_TOKEN = 'ExponentPushToken[plumber-device-1]';

const sign = (body: string) =>
  `sha256=${createHmac('sha256', 'test-whatsapp-app-secret').update(body).digest('hex')}`;

function waButtonTap(messageId: string, from: string, payload: string) {
  return JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [
      {
        changes: [
          {
            value: {
              messages: [{ id: messageId, from, type: 'button', button: { payload, text: 'x' } }],
            },
          },
        ],
      },
    ],
  });
}

async function postRequirement(title: string) {
  const res = await ctx
    .http()
    .post('/v1/requirements')
    .set(bearer(customer.accessToken))
    .send({
      type: 'service',
      title,
      categoryId: plumbingId,
      budgetMaxPaise: 250_000,
      address: {
        line1: 'C-44, Tower 2',
        sector: 'Sector Pi',
        city: 'Greater Noida',
        pincode: '201310',
        location: SECTOR_PI,
      },
      details: { description: 'Kitchen sink is blocked and overflowing', urgency: 'today' },
    })
    .expect(201);
  return res.body.id as string;
}

beforeAll(async () => {
  ctx = await createTestApp();
  wa = ctx.app.get(WHATSAPP_PROVIDER);
  push = ctx.app.get(PUSH_PROVIDER);

  const opsTmp = await login(ctx, '9600000001');
  await ctx.db
    .update(users)
    .set({ roles: ['ops'] })
    .where(eq(users.id, opsTmp.user.id));
  const ops = await login(ctx, '9600000001');
  customer = await login(ctx, '9600000002');
  plumber = await login(ctx, '9600000003');
  plumberPhone = '919600000003';

  const p = await ctx
    .http()
    .post('/v1/partners/me')
    .set(bearer(plumber.accessToken))
    .send({
      displayName: 'Suresh Plumbing',
      trades: ['plumber'],
      baseLocation: { lat: 28.47, lng: 77.51 },
    })
    .expect(201);
  await ctx
    .http()
    .post(`/v1/admin/partners/${p.body.id}/verification`)
    .set(bearer(ops.accessToken))
    .send({ status: 'verified' })
    .expect(201);

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

describe('notification settings', () => {
  it('registers Expo push tokens and rejects anything else', async () => {
    await ctx
      .http()
      .post('/v1/me/push-tokens')
      .set(bearer(plumber.accessToken))
      .send({ token: PUSH_TOKEN, platform: 'android' })
      .expect(204);
    await ctx
      .http()
      .post('/v1/me/push-tokens')
      .set(bearer(plumber.accessToken))
      .send({ token: 'not-a-token', platform: 'android' })
      .expect(400);
  });

  it('records WhatsApp opt-in', async () => {
    await ctx
      .http()
      .post('/v1/me/whatsapp-opt-in')
      .set(bearer(plumber.accessToken))
      .send({ optIn: true })
      .expect(204);
    const [u] = await ctx.db.select().from(users).where(eq(users.id, plumber.user.id));
    expect(u!.whatsappOptInAt).toBeInstanceOf(Date);
  });
});

describe('lead alerts', () => {
  it('sends the matched partner a WhatsApp template with Accept / Not today buttons and a push', async () => {
    const before = wa.sent.length;
    await postRequirement('Kitchen sink blocked');
    const msg = wa.sent.at(-1)!;
    expect(wa.sent.length).toBe(before + 1);
    expect(msg).toMatchObject({ to: '+919600000003', template: 'setu_new_lead' });
    expect(msg.bodyParams[0]).toBe('Kitchen sink blocked');
    expect(msg.bodyParams[1]).toBe('Sector Pi');
    expect(msg.buttonPayloads![0]).toMatch(/^lead:[0-9a-f-]{36}:accept$/);

    const p = push.sent.at(-1)!;
    expect(p.tokens).toEqual([PUSH_TOKEN]);
    expect(p.msg.title).toBe('New lead in Sector Pi');
    expect(p.msg.data.screen).toBe('lead');
  });
});

describe('WhatsApp webhook', () => {
  it('answers Meta’s verification challenge only with the right token', async () => {
    const ok = await ctx
      .http()
      .get('/v1/webhooks/whatsapp')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'test-verify-token',
        'hub.challenge': '42',
      })
      .expect(200);
    expect(ok.text).toBe('42');
    await ctx
      .http()
      .get('/v1/webhooks/whatsapp')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': '42' })
      .expect(403);
  });

  it('rejects unsigned or tampered deliveries', async () => {
    const body = waButtonTap(
      'wamid.bad',
      plumberPhone,
      'lead:00000000-0000-0000-0000-000000000000:decline',
    );
    await ctx
      .http()
      .post('/v1/webhooks/whatsapp')
      .set('content-type', 'application/json')
      .send(body)
      .expect(403);
    await ctx
      .http()
      .post('/v1/webhooks/whatsapp')
      .set('content-type', 'application/json')
      .set('x-hub-signature-256', sign(body + ' '))
      .send(body)
      .expect(403);
  });

  it('“Not today” declines the lead, once, even if Meta retries', async () => {
    const reqId = await postRequirement('Bathroom geyser pipe leak');
    const [p] = await ctx.db.select().from(partners).where(eq(partners.userId, plumber.user.id));
    const [lead] = await ctx.db
      .select()
      .from(leads)
      .where(and(eq(leads.requirementId, reqId), eq(leads.partnerId, p!.id)));

    const body = waButtonTap('wamid.decline.1', plumberPhone, `lead:${lead!.id}:decline`);
    for (let i = 0; i < 2; i++) {
      await ctx
        .http()
        .post('/v1/webhooks/whatsapp')
        .set('content-type', 'application/json')
        .set('x-hub-signature-256', sign(body))
        .send(body)
        .expect(200);
    }
    const [after] = await ctx.db.select().from(leads).where(eq(leads.id, lead!.id));
    expect(after!.status).toBe('declined');
    const inbound = await ctx.db
      .select()
      .from(inboundWebhooks)
      .where(eq(inboundWebhooks.externalId, 'wamid.decline.1'));
    expect(inbound).toHaveLength(1);
    expect(inbound[0]!.processedAt).toBeInstanceOf(Date);
  });

  it('a stranger cannot act on someone else’s lead', async () => {
    const reqId = await postRequirement('Overhead tank overflow');
    const [lead] = await ctx.db.select().from(leads).where(eq(leads.requirementId, reqId));
    const body = waButtonTap('wamid.stranger', '919600000002', `lead:${lead!.id}:decline`);
    await ctx
      .http()
      .post('/v1/webhooks/whatsapp')
      .set('content-type', 'application/json')
      .set('x-hub-signature-256', sign(body))
      .send(body)
      .expect(200);
    const [after] = await ctx.db.select().from(leads).where(eq(leads.id, lead!.id));
    expect(after!.status).toBe('sent');
    const [inbound] = await ctx.db
      .select()
      .from(inboundWebhooks)
      .where(eq(inboundWebhooks.externalId, 'wamid.stranger'));
    expect(inbound!.error).toBeTruthy();
  });

  it('“Accept” marks the lead seen so the partner is prompted to quote', async () => {
    const reqId = await postRequirement('Shower mixer replacement');
    const [lead] = await ctx.db.select().from(leads).where(eq(leads.requirementId, reqId));
    const body = waButtonTap('wamid.accept.1', plumberPhone, `lead:${lead!.id}:accept`);
    await ctx
      .http()
      .post('/v1/webhooks/whatsapp')
      .set('content-type', 'application/json')
      .set('x-hub-signature-256', sign(body))
      .send(body)
      .expect(200);
    const [after] = await ctx.db.select().from(leads).where(eq(leads.id, lead!.id));
    expect(after!.status).toBe('seen');
  });
});

describe('customer and partner updates through the job', () => {
  it('customer hears about the quote, partner about the hire, customer about progress', async () => {
    const reqId = await postRequirement('Replace kitchen tap');
    const [lead] = await ctx.db.select().from(leads).where(eq(leads.requirementId, reqId));
    const q = await ctx
      .http()
      .post(`/v1/partner/leads/${lead!.id}/quote`)
      .set(bearer(plumber.accessToken))
      .send({ items: [{ description: 'Tap + fitting', quantity: 1, unitPricePaise: 120_000 }] })
      .expect(201);

    const inboxCustomer = await ctx
      .http()
      .get('/v1/me/notifications')
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(inboxCustomer.body[0]).toMatchObject({ template: 'quote_received', status: 'skipped' }); // no device yet
    // No WhatsApp opt-in: logged as skipped with the reason, never sent.
    const [waRow] = await ctx.db
      .select()
      .from(notifications)
      .where(
        and(eq(notifications.userId, customer.user.id), eq(notifications.channel, 'whatsapp')),
      );
    expect(waRow).toMatchObject({ status: 'skipped', error: 'No WhatsApp opt-in' });
    expect(wa.sent.some((m) => m.to === '+919600000002')).toBe(false);

    await ctx
      .http()
      .post('/v1/me/push-tokens')
      .set(bearer(customer.accessToken))
      .send({ token: 'ExponentPushToken[customer-phone]', platform: 'ios' })
      .expect(204);
    const accepted = await ctx
      .http()
      .post(`/v1/quotes/${q.body.id}/accept`)
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(wa.sent.at(-1)).toMatchObject({ to: '+919600000003', template: 'setu_hired' });

    const slot = new Date(Date.now() + 86_400_000).toISOString();
    await ctx
      .http()
      .post(`/v1/jobs/${accepted.body.job.id}/schedule`)
      .set(bearer(plumber.accessToken))
      .send({ slotStart: slot })
      .expect(200);
    const last = push.sent.at(-1)!;
    expect(last.tokens).toEqual(['ExponentPushToken[customer-phone]']);
    expect(last.msg.title).toBe('Scheduled');
    expect(last.msg.data).toEqual({ screen: 'job', id: accepted.body.job.id });

    // The partner who scheduled does not get a message about their own action.
    const partnerJobUpdates = await ctx.db
      .select()
      .from(notifications)
      .where(
        and(eq(notifications.userId, plumber.user.id), eq(notifications.template, 'job_update')),
      );
    expect(partnerJobUpdates).toHaveLength(0);
  });
});
