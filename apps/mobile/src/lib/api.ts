import { createSetuClient, type TokenStore, type Tokens } from '@setu/api-client';
import { createSetuQueries } from '@setu/api-client/react';
import { QueryClient } from '@tanstack/react-query';
import { API_URL, IS_PARTNER } from './config';
import { secureStorage } from './storage';

const SESSION_KEY = IS_PARTNER ? 'setu.partner.session' : 'setu.session';
const DEVICE_KEY = 'setu.device';

/** Session kept in memory for speed and mirrored to secure storage. */
let cached: Tokens | null | undefined;
const listeners = new Set<(signedIn: boolean) => void>();

const tokenStore: TokenStore = {
  async get() {
    if (cached === undefined) {
      const raw = await secureStorage.get(SESSION_KEY);
      cached = raw ? (JSON.parse(raw) as Tokens) : null;
    }
    return cached;
  },
  async set(tokens) {
    const changed = Boolean(cached) !== Boolean(tokens);
    cached = tokens;
    if (tokens) await secureStorage.set(SESSION_KEY, JSON.stringify(tokens));
    else await secureStorage.remove(SESSION_KEY);
    if (changed) listeners.forEach((l) => l(Boolean(tokens)));
  },
};

export function onSessionChange(listener: (signedIn: boolean) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const client = createSetuClient({
  baseUrl: API_URL,
  tokens: tokenStore,
  headers: { 'x-setu-app': IS_PARTNER ? 'partner' : 'customer' },
});

export const $api = createSetuQueries(client);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: 1 },
  },
});

/** Stable per-install id; partner accounts are bound to the device they verify on. */
export async function deviceId(): Promise<string> {
  const existing = await secureStorage.get(DEVICE_KEY);
  if (existing) return existing;
  const id = `dev_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  await secureStorage.set(DEVICE_KEY, id);
  return id;
}
