import createClient, { type Client } from 'openapi-fetch';
import type { components, paths } from './schema';

export type { components, paths } from './schema';

/** Wire shapes of every documented request and response, keyed by DTO name. */
export type Schemas = components['schemas'];
export type Me = Schemas['MeDto'];
export type AuthSession = Schemas['AuthSessionDto'];
export type Category = Schemas['CategoryDto'];
export type Requirement = Schemas['RequirementDto'];
export type JobView = Schemas['JobViewDto'];
export type JobEvent = Schemas['JobEventDto'];
export type Partner = Schemas['PartnerDto'];
export type LeadInboxItem = Schemas['LeadInboxItemDto'];
export type Quote = Schemas['QuoteDto'];
export type QuoteDetail = Schemas['QuoteDetailDto'];
export type PaymentOrder = Schemas['PaymentOrderDto'];
export type JobPayments = Schemas['JobPaymentsDto'];
export type AppNotification = Schemas['NotificationDto'];

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Where the session lives: SecureStore on mobile, memory (or an httpOnly-cookie proxy) on
 * the web. Both methods may be async.
 */
export interface TokenStore {
  get(): Tokens | null | Promise<Tokens | null>;
  set(tokens: Tokens | null): void | Promise<void>;
}

export function memoryTokenStore(initial: Tokens | null = null): TokenStore {
  let current = initial;
  return {
    get: () => current,
    set: (t) => {
      current = t;
    },
  };
}

/** A non-2xx response. `code` is the API's machine-readable reason when it sends one. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    const b = (body ?? {}) as { message?: unknown };
    super(
      typeof b.message === 'string'
        ? b.message
        : Array.isArray(b.message)
          ? b.message.join(', ')
          : `Request failed (${status})`,
    );
    this.name = 'ApiError';
  }

  get code(): string | undefined {
    const c = (this.body as { code?: unknown } | null)?.code;
    return typeof c === 'string' ? c : undefined;
  }
}

export interface SetuClientOptions {
  /** API origin, e.g. `https://api.abhiyantrisetu.com` (paths already start with /v1). */
  baseUrl: string;
  tokens?: TokenStore;
  fetch?: typeof fetch;
  /** Called once when the refresh token is rejected; send the user to login. */
  onSessionExpired?: () => void;
  /** Sent on every request, e.g. `{ 'x-app-version': '1.0.0' }`. */
  headers?: Record<string, string>;
}

export interface SetuClient {
  /** Typed openapi-fetch client: `api.GET('/v1/jobs/{id}', { params: { path: { id } } })`. */
  api: Client<paths>;
  tokens: TokenStore;
  /** Verifies the OTP, stores the session and returns it. */
  login(input: { phone: string; code: string; deviceId?: string }): Promise<AuthSession>;
  /** Revokes the refresh token server-side (best effort) and clears the session. */
  logout(): Promise<void>;
}

export function createSetuClient(options: SetuClientOptions): SetuClient {
  const baseFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const tokens = options.tokens ?? memoryTokenStore();
  const base = options.baseUrl.replace(/\/$/, '');
  let refreshing: Promise<string | null> | null = null;

  /** One refresh at a time; concurrent 401s wait for the same rotation. */
  function refresh(): Promise<string | null> {
    refreshing ??= (async () => {
      const current = await tokens.get();
      if (!current) return null;
      const res = await baseFetch(`${base}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...options.headers },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      }).catch(() => null);
      if (!res) return null; // offline: keep the session, the caller sees the 401
      if (!res.ok) {
        await tokens.set(null);
        options.onSessionExpired?.();
        return null;
      }
      const next = (await res.json()) as Tokens;
      await tokens.set({ accessToken: next.accessToken, refreshToken: next.refreshToken });
      return next.accessToken;
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function authedFetch(request: Request): Promise<Response> {
    const retry = request.clone();
    const current = await tokens.get();
    if (current) request.headers.set('authorization', `Bearer ${current.accessToken}`);
    const res = await baseFetch(request);
    if (res.status !== 401 || !current || request.url.includes('/v1/auth/')) return res;
    const accessToken = await refresh();
    if (!accessToken) return res;
    retry.headers.set('authorization', `Bearer ${accessToken}`);
    return baseFetch(retry);
  }

  const api = createClient<paths>({ baseUrl: base, fetch: authedFetch, headers: options.headers });

  return {
    api,
    tokens,
    async login(input) {
      const session = unwrap(await api.POST('/v1/auth/otp/verify', { body: input }));
      await tokens.set({ accessToken: session.accessToken, refreshToken: session.refreshToken });
      return session;
    },
    async logout() {
      const current = await tokens.get();
      if (current) {
        await api
          .POST('/v1/auth/logout', { body: { refreshToken: current.refreshToken } })
          .catch(() => undefined);
      }
      await tokens.set(null);
    },
  };
}

/** Returns `data` from an openapi-fetch result, or throws an `ApiError`. */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (!result.response.ok) throw new ApiError(result.response.status, result.error);
  return result.data as T;
}
