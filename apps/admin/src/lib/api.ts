'use client';

import { createSetuClient, type TokenStore, type Tokens } from '@setu/api-client';
import { createSetuQueries } from '@setu/api-client/react';
import { QueryClient } from '@tanstack/react-query';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const KEY = 'setu.admin.session';

/** Staff sessions live in sessionStorage: closing the tab signs out. */
const listeners = new Set<(signedIn: boolean) => void>();
const store: TokenStore = {
  get() {
    try {
      const raw = sessionStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Tokens) : null;
    } catch {
      return null;
    }
  },
  set(tokens) {
    try {
      if (tokens) sessionStorage.setItem(KEY, JSON.stringify(tokens));
      else sessionStorage.removeItem(KEY);
    } catch {
      // Private mode without storage: the session lasts until reload.
    }
    listeners.forEach((l) => l(Boolean(tokens)));
  },
};

export function onSessionChange(listener: (signedIn: boolean) => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export const client = createSetuClient({ baseUrl: API_URL, tokens: store });
export const $api = createSetuQueries(client);
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000, retry: 1, refetchOnWindowFocus: true } },
});

/** A message fit to show, for any thrown value or API error body. */
export function errorMessage(err: unknown): string {
  const body = err as { message?: unknown; errors?: { message?: string }[] } | null;
  if (body?.errors?.[0]?.message) return body.errors[0].message;
  if (typeof body?.message === 'string') return body.message;
  return 'Something went wrong. Please try again.';
}

/** Downloads an authenticated file (e.g. the waitlist CSV). */
export async function download(path: string, filename: string) {
  const tokens = await client.tokens.get();
  const res = await fetch(`${API_URL}${path}`, {
    headers: tokens ? { authorization: `Bearer ${tokens.accessToken}` } : {},
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
