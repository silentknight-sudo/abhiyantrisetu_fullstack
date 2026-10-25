'use client';

import type { Me } from '@setu/api-client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { isStaffRole, useSession } from '@/lib/session';
import { Login } from './Login';
import { Button, Card } from './ui';

type Role = Me['roles'][number];

/** Navigation, each item shown to the roles the API lets use it. */
export const NAV: { href: string; label: string; roles: Role[] }[] = [
  { href: '/', label: 'Overview', roles: ['ops', 'verification', 'support', 'finance'] },
  { href: '/partners', label: 'Partners', roles: ['ops', 'verification'] },
  { href: '/disputes', label: 'Disputes', roles: ['ops', 'support'] },
  { href: '/jobs', label: 'Jobs', roles: ['ops', 'support', 'finance'] },
  { href: '/payouts', label: 'Payouts', roles: ['ops', 'finance'] },
  { href: '/ledger', label: 'Ledger', roles: ['ops', 'finance'] },
  { href: '/waitlist', label: 'Waitlist', roles: ['ops', 'support'] },
];

export function Shell({ children }: { children: ReactNode }) {
  const { status, me, can, signOut } = useSession();
  const path = usePathname();

  if (status === 'loading') return <div className="p-10 text-sm text-text-muted">Loading…</div>;
  if (status === 'signedOut' || !me) return <Login />;
  if (!me.roles.some(isStaffRole)) {
    return (
      <main className="grid min-h-screen place-items-center p-4">
        <Card className="max-w-sm">
          <h1 className="font-display text-2xl font-semibold">No staff access</h1>
          <p className="mt-2 text-sm text-text-muted">
            {me.phone} is not a staff account. Ask a super admin to add a staff role.
          </p>
          <Button kind="outline" className="mt-4" onClick={() => void signOut()}>
            Sign out
          </Button>
        </Card>
      </main>
    );
  }
  const items = NAV.filter((n) => can(...n.roles));
  const allowed = items.some((n) => n.href === path || (n.href !== '/' && path.startsWith(n.href)));

  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-b border-border bg-surface px-4 py-4 md:min-h-screen md:border-b-0 md:border-r">
        <div className="font-display text-2xl font-semibold">Setu Admin</div>
        <nav className="mt-4 flex gap-1 overflow-x-auto md:flex-col">
          {items.map((n) => {
            const active = n.href === path || (n.href !== '/' && path.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${active ? 'bg-primary text-on-primary' : 'text-text hover:bg-surface-muted'}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 hidden text-xs text-text-muted md:block">
          <div className="font-semibold text-text">{me.name ?? me.phone}</div>
          <div>{me.roles.filter(isStaffRole).join(', ')}</div>
          <button className="mt-2 underline" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl p-4 md:p-8">
        {allowed ? children : <Card>Your role does not include this page.</Card>}
      </main>
    </div>
  );
}
