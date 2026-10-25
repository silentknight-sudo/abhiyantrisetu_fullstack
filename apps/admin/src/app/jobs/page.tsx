'use client';

import { JOB_STATES } from '@setu/domain';
import { useState } from 'react';
import { Badge, Empty, Notice, PageHeader, Table, Td } from '@/components/ui';
import { $api, errorMessage } from '@/lib/api';
import { jobStateLabel, rupees, when } from '@/lib/format';

type State = (typeof JOB_STATES)[number];
const tone = (s: State) =>
  s === 'closed'
    ? 'success'
    : s === 'disputed' || s === 'cancelled'
      ? 'danger'
      : s === 'completed'
        ? 'warning'
        : 'info';

export default function Jobs() {
  const [state, setState] = useState<State | undefined>();
  const list = $api.useQuery('get', '/v1/admin/jobs', {
    params: { query: state ? { state } : {} },
  });
  return (
    <>
      <PageHeader title="Jobs" lead="Every hired job, most recently updated first (latest 200)." />
      <div className="mb-4 flex flex-wrap gap-2">
        {[undefined, ...JOB_STATES].map((s) => (
          <button
            key={s ?? 'all'}
            onClick={() => setState(s)}
            className={`rounded-full border px-3 py-1.5 text-sm ${state === s ? 'border-primary bg-primary text-on-primary' : 'border-border bg-surface'}`}
          >
            {s ? jobStateLabel(s) : 'All'}
          </button>
        ))}
      </div>
      {list.error ? <Notice>{errorMessage(list.error)}</Notice> : null}
      {list.data?.length === 0 ? <Empty>No jobs here.</Empty> : null}
      {list.data?.length ? (
        <Table head={['Job', 'Customer', 'Partner', 'Amount', 'Visit', 'Updated', 'State']}>
          {list.data.map((j) => (
            <tr key={j.id}>
              <Td className="font-semibold">{j.title}</Td>
              <Td>
                {j.customerName ?? '—'}
                <div className="text-xs text-text-muted">{j.customerPhone}</div>
              </Td>
              <Td>
                {j.partnerName}
                <div className="text-xs text-text-muted">{j.partnerPhone}</div>
              </Td>
              <Td>{rupees(j.agreedTotalPaise)}</Td>
              <Td>{when(j.slotStart)}</Td>
              <Td>{when(j.updatedAt)}</Td>
              <Td>
                <Badge tone={tone(j.state)}>{jobStateLabel(j.state)}</Badge>
              </Td>
            </tr>
          ))}
        </Table>
      ) : null}
    </>
  );
}
