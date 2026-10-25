'use client';

import type { Me } from '@setu/api-client';
import { STAFF_ROLES } from '@setu/domain';
import { createContext, type ReactNode, use, useEffect, useState } from 'react';
import { $api, client, onSessionChange, queryClient } from './api';

type Role = Me['roles'][number];

interface Session {
  status: 'loading' | 'signedOut' | 'signedIn';
  me: Me | null;
  can(...roles: Role[]): boolean;
  signOut(): Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [hasTokens, setHasTokens] = useState<boolean | null>(null);
  useEffect(() => {
    void Promise.resolve(client.tokens.get()).then((t) => setHasTokens(Boolean(t)));
    return onSessionChange((signedIn) => {
      setHasTokens(signedIn);
      if (!signedIn) queryClient.clear();
    });
  }, []);
  const me = $api.useQuery('get', '/v1/me', {}, { enabled: hasTokens === true });

  const status: Session['status'] =
    hasTokens === null || (hasTokens && me.isPending)
      ? 'loading'
      : hasTokens && me.data
        ? 'signedIn'
        : 'signedOut';
  const roles = me.data?.roles ?? [];
  const value: Session = {
    status,
    me: me.data ?? null,
    can: (...allowed) => roles.includes('super_admin') || roles.some((r) => allowed.includes(r)),
    async signOut() {
      await client.logout();
      queryClient.clear();
    },
  };
  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): Session {
  const s = use(SessionContext);
  if (!s) throw new Error('useSession outside SessionProvider');
  return s;
}

export const isStaffRole = (r: Role) => (STAFF_ROLES as readonly string[]).includes(r);
