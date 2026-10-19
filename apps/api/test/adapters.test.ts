import { describe, expect, it, vi } from 'vitest';
import { loadEnv } from '../src/config/env';
import { DisabledSmsProvider } from '../src/modules/identity/sms/disabled.provider';
import { Msg91SmsProvider } from '../src/modules/identity/sms/msg91.provider';

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
      loadEnv({ ...base, NODE_ENV: 'production', SMS_PROVIDER: 'disabled' }).SMS_PROVIDER,
    ).toBe('disabled');
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
