'use client';

import { WAITLIST_ROLES } from '@setu/schemas';
import { useState } from 'react';
import { Button, Card, Empty, Notice, PageHeader, Table, Td } from '@/components/ui';
import { $api, download, errorMessage } from '@/lib/api';
import { day, tradeLabel } from '@/lib/format';

type Role = (typeof WAITLIST_ROLES)[number];
const ROLE_LABEL: Record<Role, string> = {
  customer: 'Customers',
  provider: 'Pros and contractors',
  supplier: 'Suppliers and rentals',
  society: 'Societies and RWAs',
};

export default function Waitlist() {
  const [role, setRole] = useState<Role | undefined>();
  const summary = $api.useQuery('get', '/v1/admin/waitlist/summary');
  const list = $api.useQuery('get', '/v1/admin/waitlist', {
    params: { query: role ? { role } : {} },
  });
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        title="Waitlist"
        lead="Early-access sign-ups from the website. Everyone here agreed to be contacted about the launch."
        actions={
          <Button
            kind="outline"
            onClick={() =>
              download(
                `/v1/admin/waitlist/export.csv${role ? `?role=${role}` : ''}`,
                'setu-waitlist.csv',
              ).catch((e: Error) => setError(e.message))
            }
          >
            Download CSV
          </Button>
        }
      />
      {error || list.error ? <Notice>{error ?? errorMessage(list.error)}</Notice> : null}
      {summary.data ? (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Card>
            <div className="mb-2 text-sm font-semibold">By role</div>
            {WAITLIST_ROLES.map((r) => (
              <div key={r} className="flex justify-between py-0.5 text-sm">
                <span>{ROLE_LABEL[r]}</span>
                <span className="font-semibold">
                  {summary.data.byRole.find((x) => x.role === r)?.n ?? 0}
                </span>
              </div>
            ))}
          </Card>
          <Card>
            <div className="mb-2 text-sm font-semibold">Top sectors</div>
            {summary.data.bySector.slice(0, 6).map((s) => (
              <div key={s.sector ?? 'none'} className="flex justify-between py-0.5 text-sm">
                <span>{s.sector ?? 'Not given'}</span>
                <span className="font-semibold">{s.n}</span>
              </div>
            ))}
          </Card>
        </div>
      ) : null}
      <div className="mb-4 flex flex-wrap gap-2">
        {[undefined, ...WAITLIST_ROLES].map((r) => (
          <button
            key={r ?? 'all'}
            onClick={() => setRole(r)}
            className={`rounded-full border px-3 py-1.5 text-sm ${role === r ? 'border-primary bg-primary text-on-primary' : 'border-border bg-surface'}`}
          >
            {r ? ROLE_LABEL[r] : 'All'}
          </button>
        ))}
      </div>
      {list.data?.rows.length === 0 ? <Empty>No sign-ups yet.</Empty> : null}
      {list.data?.rows.length ? (
        <Table head={['Name', 'Phone', 'Role', 'Sector', 'Interested in', 'Joined']}>
          {list.data.rows.map((w) => (
            <tr key={w.id}>
              <Td className="font-semibold">{w.name}</Td>
              <Td>
                <a className="underline" href={`tel:${w.phone}`}>
                  {w.phone}
                </a>
              </Td>
              <Td>{ROLE_LABEL[w.role]}</Td>
              <Td>{w.sector ?? '—'}</Td>
              <Td>{w.trade ? tradeLabel(w.trade) : w.interests.join(', ') || '—'}</Td>
              <Td>{day(w.createdAt)}</Td>
            </tr>
          ))}
        </Table>
      ) : null}
      {list.data && list.data.total > list.data.rows.length ? (
        <p className="mt-2 text-xs text-text-muted">
          Showing {list.data.rows.length} of {list.data.total}. Download the CSV for everyone.
        </p>
      ) : null}
    </>
  );
}
