'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Shell } from '@/components/Shell';
import { queryClient } from '@/lib/api';
import { SessionProvider } from '@/lib/session';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <Shell>{children}</Shell>
      </SessionProvider>
    </QueryClientProvider>
  );
}
