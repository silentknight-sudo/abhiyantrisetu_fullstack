import { createContext, type ReactNode, use, useEffect, useState } from 'react';
import { client, deviceId, onSessionChange, queryClient } from './api';
import { IS_PARTNER } from './config';
import { registerForPush } from './push';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface Session {
  status: Status;
  signIn(phone: string, code: string): Promise<{ isNew: boolean }>;
  signOut(): Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    let alive = true;
    void Promise.resolve(client.tokens.get()).then((t) => {
      if (alive) setStatus(t ? 'signedIn' : 'signedOut');
    });
    // Refresh-token rejection (or logout elsewhere) signs the user out.
    const off = onSessionChange((signedIn) => {
      setStatus(signedIn ? 'signedIn' : 'signedOut');
      if (!signedIn) queryClient.clear();
    });
    return () => {
      alive = false;
      off();
    };
  }, []);

  useEffect(() => {
    if (status === 'signedIn') void registerForPush();
  }, [status]);

  const value: Session = {
    status,
    async signIn(phone, code) {
      const session = await client.login({
        phone,
        code,
        // Partner accounts are bound to one device.
        deviceId: IS_PARTNER ? await deviceId() : undefined,
      });
      return { isNew: session.user.isNew };
    },
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
