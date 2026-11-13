'use client';

import { useState } from 'react';
import { Badge, Button, Empty, Notice, PageHeader, Table, Td } from '@/components/ui';
import { $api, errorMessage, queryClient } from '@/lib/api';

/** Open requests, oldest first. Goal: every request gets 2+ quotes within 24 hours. */
export default function Matching() {
  const q = $api.useQuery('get', '/v1/admin/matching');
  const [riskOnly, setRiskOnly] = useState(false);
  const [done, setDone] = useState<Record<string, number>>({});
  const rescue = $api.useMutation('post', '/v1/admin/requirements/{id}/rescue', {
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['get', '/v1/admin/matching'] }),
  });
  const rows = (q.data ?? []).filter((r) => !riskOnly || r.atRisk);
  const atRisk = (q.data ?? []).filter((r) => r.atRisk).length;

  return (
    <>
      <PageHeader
        title="Matching queue"
        lead="Every open request should have at least 2 quotes within 24 hours. Rescue sends a request to more verified professionals, up to 1.5× their usual distance."
      />
      {q.error || rescue.error ? <Notice>{errorMessage(q.error ?? rescue.error)}</Notice> : null}
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          [false, `All open (${q.data?.length ?? 0})`],
          [true, `Needs help (${atRisk})`],
        ].map(([v, label]) => (
          <button
            key={String(v)}
            onClick={() => setRiskOnly(v as boolean)}
            className={`rounded-full border px-3 py-1.5 text-sm ${riskOnly === v ? 'border-primary bg-primary text-on-primary' : 'border-border bg-surface'}`}
          >
            {label as string}
          </button>
        ))}
      </div>
      {q.data && rows.length === 0 ? <Empty>No open requests need attention.</Empty> : null}
      {rows.length ? (
        <Table head={['Request', 'Sector', 'Age', 'Leads', 'Quotes', '']}>
          {rows.map((r) => (
            <tr key={r.id} data-testid={`req-${r.id}`}>
              <Td>
                <div className="font-medium">{r.title}</div>
                <div className="text-xs text-text-muted">
                  {r.type.replace('_', ' ')} · {r.status} · {r.customerPhone}
                </div>
              </Td>
              <Td>{r.sector ?? '—'}</Td>
              <Td>
                {r.ageHours < 1 ? 'under 1 h' : `${r.ageHours} h`}{' '}
                {r.atRisk ? <Badge tone="danger">Over 24 h</Badge> : null}
              </Td>
              <Td>{r.leadsSent}</Td>
              <Td>
                <Badge tone={r.quotes >= 2 ? 'success' : r.quotes === 1 ? 'warning' : 'neutral'}>
                  {r.quotes}
                </Badge>
              </Td>
              <Td>
                {done[r.id] !== undefined ? (
                  <span className="text-sm text-text-muted">
                    {done[r.id] ? `Sent to ${done[r.id]} more` : 'No one else nearby'}
                  </span>
                ) : (
                  <Button
                    kind={r.atRisk ? 'primary' : 'outline'}
                    disabled={rescue.isPending}
                    onClick={() =>
                      rescue.mutate(
                        { params: { path: { id: r.id } } },
                        { onSuccess: (res) => setDone((d) => ({ ...d, [r.id]: res.leadsSent })) },
                      )
                    }
                  >
                    Rescue
                  </Button>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      ) : null}
    </>
  );
}
