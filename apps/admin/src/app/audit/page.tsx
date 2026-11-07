'use client';

import { useState } from 'react';
import { Empty, Notice, PageHeader, Table, Td } from '@/components/ui';
import { $api, errorMessage } from '@/lib/api';

const TYPES = ['all', 'partner', 'service', 'user', 'payout', 'refund', 'job'] as const;
const show = (v: unknown) =>
  v == null ? '–' : typeof v === 'object' ? JSON.stringify(v, null, 0) : String(v);

export default function Audit() {
  const [type, setType] = useState<(typeof TYPES)[number]>('all');
  const list = $api.useQuery('get', '/v1/admin/audit', {
    params: { query: type === 'all' ? {} : { entityType: type } },
  });
  return (
    <>
      <PageHeader
        title="Audit log"
        lead="Every staff action: who did it, when, from where, and what changed. Entries cannot be edited or deleted."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-full border px-3 py-1.5 text-sm capitalize ${type === t ? 'border-primary bg-primary text-on-primary' : 'border-border bg-surface'}`}
          >
            {t}
          </button>
        ))}
      </div>
      {list.error ? <Notice>{errorMessage(list.error)}</Notice> : null}
      {list.data?.length === 0 ? <Empty>Nothing recorded yet.</Empty> : null}
      {list.data?.length ? (
        <Table head={['When', 'Who', 'Action', 'Record', 'Before', 'After']}>
          {list.data.map((a) => (
            <tr key={a.id}>
              <Td className="whitespace-nowrap">
                {new Date(a.createdAt).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
                <div className="text-xs text-text-muted">{a.ip ?? ''}</div>
              </Td>
              <Td>{a.actorPhone ?? 'system'}</Td>
              <Td className="font-semibold">{a.action}</Td>
              <Td className="text-xs">
                {a.entityType} · <span className="font-mono">{a.entityId.slice(0, 8)}</span>
              </Td>
              <Td className="max-w-64 break-words font-mono text-xs">{show(a.before)}</Td>
              <Td className="max-w-64 break-words font-mono text-xs">{show(a.after)}</Td>
            </tr>
          ))}
        </Table>
      ) : null}
    </>
  );
}
