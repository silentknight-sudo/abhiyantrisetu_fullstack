import { describe, expect, it, vi } from 'vitest';
import { useRedisStore } from '../src/common/rate-limit.module';
import { loadEnv } from '../src/config/env';
import { storageMode } from '../src/modules/storage/storage.module';
import { DisabledSmsProvider } from '../src/modules/identity/sms/disabled.provider';
import { Msg91SmsProvider } from '../src/modules/identity/sms/msg91.provider';
import { ExpoPushProvider } from '../src/modules/notifications/providers/push.provider';
import { MetaWhatsAppProvider } from '../src/modules/notifications/providers/whatsapp.provider';
import { RazorpayGateway } from '../src/modules/payments/razorpay.provider';

const base = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  OTP_HASH_SECRET: 'b'.repeat(32),
};

describe('env validation', () => {
  it('forbids console SMS in production', () => {
    expect(() => loadEnv({ ...base, NODE_ENV: 'production' })).toThrow(/console SMS/);
  });
  it('allows login to be disabled in production (pre-launch)', () => {
    expect(
      loadEnv({
        ...base,
        NODE_ENV: 'production',
        SMS_PROVIDER: 'disabled',
        WHATSAPP_PROVIDER: 'disabled',
        PUSH_PROVIDER: 'disabled',
        PAYMENTS_PROVIDER: 'disabled',
      }).SMS_PROVIDER,
    ).toBe('disabled');
  });
  it('keeps photos off in production until S3 is configured, and never on local disk', () => {
    const prod = {
      ...base,
      NODE_ENV: 'production',
      SMS_PROVIDER: 'disabled',
      WHATSAPP_PROVIDER: 'disabled',
      PUSH_PROVIDER: 'disabled',
      PAYMENTS_PROVIDER: 'disabled',
    };
    expect(storageMode(loadEnv(prod))).toBe('disabled');
    expect(storageMode(loadEnv(base))).toBe('local');
    expect(() => loadEnv({ ...prod, STORAGE_PROVIDER: 'local' })).toThrow(/local photo storage/);
    expect(() => loadEnv({ ...prod, STORAGE_PROVIDER: 's3', S3_BUCKET: 'b' })).toThrow(
      /S3_ACCESS_KEY_ID/,
    );
    expect(
      storageMode(
        loadEnv({
          ...prod,
          STORAGE_PROVIDER: 's3',
          S3_BUCKET: 'b',
          S3_ACCESS_KEY_ID: 'k',
          S3_SECRET_ACCESS_KEY: 's',
        }),
      ),
    ).toBe('s3');
  });
  it('keeps rate limits in Redis in production unless told otherwise', () => {
    const prod = {
      ...base,
      NODE_ENV: 'production',
      SMS_PROVIDER: 'disabled',
      WHATSAPP_PROVIDER: 'disabled',
      PUSH_PROVIDER: 'disabled',
      PAYMENTS_PROVIDER: 'disabled',
    };
    expect(useRedisStore(loadEnv(prod))).toBe(true);
    expect(useRedisStore(loadEnv({ ...prod, THROTTLE_STORE: 'memory' }))).toBe(false);
    expect(useRedisStore(loadEnv(base))).toBe(false);
  });
  it('forbids console WhatsApp and push in production', () => {
    expect(() =>
      loadEnv({
        ...base,
        NODE_ENV: 'production',
        SMS_PROVIDER: 'disabled',
        PUSH_PROVIDER: 'disabled',
      }),
    ).toThrow(/WHATSAPP_PROVIDER/);
  });
  it('requires all Meta WhatsApp settings when selected', () => {
    expect(() => loadEnv({ ...base, WHATSAPP_PROVIDER: 'meta', WHATSAPP_TOKEN: 'x' })).toThrow(
      /WHATSAPP_PHONE_NUMBER_ID/,
    );
  });
  it('requires MSG91 credentials when selected', () => {
    expect(() => loadEnv({ ...base, SMS_PROVIDER: 'msg91' })).toThrow(/MSG91_AUTH_KEY/);
  });
  it('forbids fake payments in production and needs every Razorpay key', () => {
    const prod = {
      ...base,
      NODE_ENV: 'production',
      SMS_PROVIDER: 'disabled',
      WHATSAPP_PROVIDER: 'disabled',
      PUSH_PROVIDER: 'disabled',
    };
    expect(() => loadEnv(prod)).toThrow(/fake payments/);
    expect(() =>
      loadEnv({ ...prod, PAYMENTS_PROVIDER: 'razorpay', RAZORPAY_KEY_ID: 'rzp_live_x' }),
    ).toThrow(/RAZORPAY_KEY_SECRET/);
  });
  it('rejects short secrets', () => {
    expect(() => loadEnv({ ...base, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/);
  });
});

describe('Msg91SmsProvider', () => {
  it('posts the OTP to the flow API without the + prefix', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{"type":"success"}', { status: 200 }));
    await new Msg91SmsProvider('key', 'tmpl', fetchMock).sendOtp('+919876543210', '123456');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://control.msg91.com/api/v5/flow');
    expect(init.headers.authkey).toBe('key');
    expect(JSON.parse(init.body)).toMatchObject({
      template_id: 'tmpl',
      recipients: [{ mobiles: '919876543210', otp: '123456' }],
    });
  });

  it('surfaces vendor failures as 503', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('bad', { status: 500 }));
    await expect(
      new Msg91SmsProvider('key', 'tmpl', fetchMock).sendOtp('+919876543210', '1'),
    ).rejects.toThrow(/Could not send/);
  });
});

describe('DisabledSmsProvider', () => {
  it('refuses with a clear pre-launch message', async () => {
    await expect(new DisabledSmsProvider().sendOtp()).rejects.toThrow(/Login opens at launch/);
  });
});

describe('MetaWhatsAppProvider', () => {
  it('sends an approved template with body variables and quick-reply payloads', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), { status: 200 }),
      );
    const id = await new MetaWhatsAppProvider('tok', '12345', fetchMock).send({
      to: '+919876543210',
      template: 'setu_new_lead',
      language: 'hi',
      bodyParams: ['Tap leaking', 'Sector Pi'],
      buttonPayloads: ['lead:abc:accept', 'lead:abc:decline'],
    });
    expect(id).toBe('wamid.1');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://graph.facebook.com/v21.0/12345/messages');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      to: '919876543210',
      type: 'template',
      template: { name: 'setu_new_lead', language: { code: 'hi' } },
    });
    expect(body.template.components[0].parameters.map((p: { text: string }) => p.text)).toEqual([
      'Tap leaking',
      'Sector Pi',
    ]);
    expect(body.template.components[2]).toMatchObject({
      sub_type: 'quick_reply',
      index: '1',
      parameters: [{ payload: 'lead:abc:decline' }],
    });
  });

  it('throws with Meta’s error message', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Template not approved' } }), {
        status: 400,
      }),
    );
    await expect(
      new MetaWhatsAppProvider('t', '1', fetchMock).send({
        to: '+91',
        template: 'x',
        language: 'en',
        bodyParams: [],
      }),
    ).rejects.toThrow(/Template not approved/);
  });
});

describe('ExpoPushProvider', () => {
  it('reports dead device tokens for cleanup', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ status: 'ok' }, { status: 'error', details: { error: 'DeviceNotRegistered' } }],
        }),
        { status: 200 },
      ),
    );
    const res = await new ExpoPushProvider(undefined, fetchMock).send(
      ['ExponentPushToken[a]', 'ExponentPushToken[b]'],
      {
        title: 't',
        body: 'b',
        data: {},
      },
    );
    expect(res).toEqual({ ok: true, deadTokens: ['ExponentPushToken[b]'], error: undefined });
  });
});

describe('RazorpayGateway', () => {
  it('creates an INR order with basic auth', async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ id: 'order_123' }), { status: 200 }),
    );
    const gw = new RazorpayGateway('rzp_test_key', 'secret', fetchImpl as unknown as typeof fetch);
    await expect(
      gw.createOrder({ amountPaise: 89_900, receipt: 'r1', notes: { jobId: 'j' } }),
    ).resolves.toEqual({
      id: 'order_123',
    });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.razorpay.com/v1/orders');
    expect((init.headers as Record<string, string>).authorization).toBe(
      `Basic ${Buffer.from('rzp_test_key:secret').toString('base64')}`,
    );
    expect(JSON.parse(String(init.body))).toMatchObject({
      amount: 89_900,
      currency: 'INR',
      receipt: 'r1',
    });
  });
  it('refunds a payment at normal speed with a receipt', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: 'rfnd_1', status: 'pending' }), { status: 200 }),
    );
    const gw = new RazorpayGateway('k', 's', fetchImpl as unknown as typeof fetch);
    await expect(
      gw.refund({
        razorpayPaymentId: 'pay_9',
        amountPaise: 75_000,
        receipt: 'r-1',
        notes: { jobId: 'j' },
      }),
    ).resolves.toEqual({ id: 'rfnd_1', status: 'pending' });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.razorpay.com/v1/payments/pay_9/refund');
    expect(JSON.parse(String(init.body))).toMatchObject({
      amount: 75_000,
      speed: 'normal',
      receipt: 'r-1',
    });
  });
  it('throws with Razorpay’s error description', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { description: 'Authentication failed' } }), {
          status: 401,
        }),
    );
    const gw = new RazorpayGateway('k', 's', fetchImpl as unknown as typeof fetch);
    await expect(gw.createOrder({ amountPaise: 100, receipt: 'r', notes: {} })).rejects.toThrow(
      /401: Authentication failed/,
    );
  });
});
