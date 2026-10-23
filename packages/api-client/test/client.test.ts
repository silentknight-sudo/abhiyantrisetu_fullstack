import { describe, expect, it, vi } from 'vitest';
import { ApiError, createSetuClient, memoryTokenStore, unwrap } from '../src';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function server(handler: (req: Request) => Response | Promise<Response>) {
  const calls: { url: string; auth: string | null; body: string }[] = [];
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init);
    calls.push({
      url: new URL(req.url).pathname,
      auth: req.headers.get('authorization'),
      body: await req.clone().text(),
    });
    return handler(req);
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls };
}

describe('createSetuClient', () => {
  it('logs in, stores the session and sends the bearer token', async () => {
    const { fetch, calls } = server((req) =>
      new URL(req.url).pathname === '/v1/auth/otp/verify'
        ? json({
            accessToken: 'a1',
            accessTokenExpiresIn: 900,
            refreshToken: 'r1',
            user: {
              id: crypto.randomUUID(),
              phone: '+919876543210',
              name: null,
              roles: ['customer'],
              isNew: true,
            },
          })
        : json([]),
    );
    const tokens = memoryTokenStore();
    const client = createSetuClient({ baseUrl: 'http://api.test/', tokens, fetch });
    const session = await client.login({ phone: '9876543210', code: '123456' });
    expect(session.user.isNew).toBe(true);
    expect(tokens.get()).toEqual({ accessToken: 'a1', refreshToken: 'r1' });

    unwrap(await client.api.GET('/v1/jobs'));
    expect(calls.at(-1)).toMatchObject({ url: '/v1/jobs', auth: 'Bearer a1' });
  });

  it('refreshes once on 401 and retries, even for concurrent requests', async () => {
    let refreshes = 0;
    const { fetch, calls } = server(async (req) => {
      const path = new URL(req.url).pathname;
      if (path === '/v1/auth/refresh') {
        refreshes++;
        expect(JSON.parse(await req.text())).toEqual({ refreshToken: 'r1' });
        return json({ accessToken: 'a2', accessTokenExpiresIn: 900, refreshToken: 'r2' });
      }
      return req.headers.get('authorization') === 'Bearer a2' ? json({ ok: path }) : json({}, 401);
    });
    const tokens = memoryTokenStore({ accessToken: 'a1', refreshToken: 'r1' });
    const client = createSetuClient({ baseUrl: 'http://api.test', tokens, fetch });

    const [a, b] = await Promise.all([
      client.api.GET('/v1/me'),
      client.api.POST('/v1/requirements/{id}/cancel', {
        params: { path: { id: crypto.randomUUID() } },
        body: { reason: 'Not needed now' },
      }),
    ]);
    expect(a.response.status).toBe(200);
    expect(b.response.status).toBe(200);
    expect(refreshes).toBe(1);
    expect(tokens.get()).toEqual({ accessToken: 'a2', refreshToken: 'r2' });
    // The retried POST still carries its body.
    const retried = calls.filter((c) => c.url.endsWith('/cancel'));
    expect(retried.map((c) => c.auth)).toEqual(['Bearer a1', 'Bearer a2']);
    expect(JSON.parse(retried[1]!.body)).toEqual({ reason: 'Not needed now' });
  });

  it('clears the session and reports expiry when the refresh token is rejected', async () => {
    const { fetch } = server((req) =>
      new URL(req.url).pathname === '/v1/auth/refresh'
        ? json({ message: 'Session revoked. Please log in again.' }, 401)
        : json({}, 401),
    );
    const onSessionExpired = vi.fn();
    const tokens = memoryTokenStore({ accessToken: 'a1', refreshToken: 'r1' });
    const client = createSetuClient({
      baseUrl: 'http://api.test',
      tokens,
      fetch,
      onSessionExpired,
    });
    const res = await client.api.GET('/v1/me');
    expect(res.response.status).toBe(401);
    expect(tokens.get()).toBeNull();
    expect(onSessionExpired).toHaveBeenCalledOnce();
  });

  it('turns API errors into ApiError with the machine code', async () => {
    const { fetch } = server(() =>
      json({ code: 'ALREADY_PAID', message: 'This job is fully paid' }, 409),
    );
    const client = createSetuClient({ baseUrl: 'http://api.test', fetch });
    const err = await client.api
      .POST('/v1/payments/orders', { body: { jobId: crypto.randomUUID() } })
      .then(unwrap)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 409,
      code: 'ALREADY_PAID',
      message: 'This job is fully paid',
    });
  });
});
