'use client';

import { normalizeIndianMobile } from '@setu/domain';
import { useState } from 'react';
import { client, errorMessage } from '@/lib/api';
import { Button, Card, Notice, inputCls } from './ui';

export function Login() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (!sent) {
        if (!normalizeIndianMobile(phone))
          throw { message: 'Enter a 10-digit Indian mobile number' };
        const res = await client.api.POST('/v1/auth/otp/send', { body: { phone } });
        if (!res.response.ok) throw res.error;
        setSent(true);
      } else {
        await client.login({ phone, code });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-semibold">Setu Admin</h1>
        <p className="mt-1 text-sm text-text-muted">
          Staff sign-in with your registered mobile number.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block text-sm font-semibold">
            Mobile number
            <input
              className={`${inputCls} mt-1`}
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              disabled={sent}
            />
          </label>
          {sent ? (
            <label className="block text-sm font-semibold">
              6-digit code
              <input
                className={`${inputCls} mt-1`}
                name="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
              />
            </label>
          ) : null}
          {error ? <Notice>{error}</Notice> : null}
          <Button type="submit" busy={busy} className="w-full">
            {sent ? 'Sign in' : 'Send code'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
