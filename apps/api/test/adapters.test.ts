import { describe, expect, it, vi } from 'vitest';
import { loadEnv } from '../src/config/env';
import { DisabledSmsProvider } from '../src/modules/identity/sms/disabled.provider';
import { Msg91SmsProvider } from '../src/modules/identity/sms/msg91.provider';
import { ExpoPushProvider } from '../src/modules/notifications/providers/push.provider';
import { MetaWhatsAppProvider } from '../src/modules/notifications/providers/whatsapp.provider';

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
      }).SMS_PROVIDER,
    ).toBe('disabled');
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
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
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
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              { status: 'ok' },
              { status: 'error', details: { error: 'DeviceNotRegistered' } },
            ],
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
