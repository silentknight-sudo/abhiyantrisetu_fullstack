'use client';

import { useState } from 'react';
import { Card, Notice, PageHeader, Stat, Table, Td } from '@/components/ui';
import { $api, errorMessage } from '@/lib/api';
import { tradeLabel } from '@/lib/format';

const STEP: Record<string, string> = {
  posted: 'Posted',
  matched: 'Sent to pros',
  quoted: 'Got a quote',
  hired: 'Hired',
  completed: 'Completed',
};

/** Where requests drop off, and which trades are short of professionals. */
export default function Funnel() {
  const [days, setDays] = useState(30);
  const f = $api.useQuery('get', '/v1/admin/funnel', { params: { query: { days } } });
  const d = f.data;
  const top = d?.steps[0]?.n || 1;

  return (
    <>
      <PageHeader
        title="Funnel & supply"
        lead="Requests posted in the period and how far they got. Supply shows verified professionals per trade against open requests."
      />
      {f.error ? <Notice>{errorMessage(f.error)}</Notice> : null}
      <div className="mb-4 flex gap-2">
        {[7, 30, 90].map((n) => (
          <button
            key={n}
            onClick={() => setDays(n)}
            className={`rounded-full border px-3 py-1.5 text-sm ${days === n ? 'border-primary bg-primary text-on-primary' : 'border-border bg-surface'}`}
          >
            {n} days
          </button>
        ))}
      </div>
      {d ? (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <Stat label="Requests posted" value={d.steps[0]?.n ?? 0} />
            <Stat
              label="Median time to first quote"
              value={d.medianHoursToFirstQuote == null ? '—' : `${d.medianHoursToFirstQuote} h`}
            />
            <Stat
              label="No professional found"
              value={d.noMatch}
              hint="Requests matching could not place"
            />
          </div>
          <Card className="mb-6">
            <div className="mb-3 text-sm font-semibold">Funnel</div>
            <div className="space-y-2">
              {d.steps.map((s) => (
                <div key={s.key} className="flex items-center gap-3 text-sm">
                  <div className="w-32 shrink-0">{STEP[s.key] ?? s.key}</div>
                  <div className="h-6 flex-1 rounded bg-surface-muted">
                    <div
                      className="flex h-6 items-center rounded bg-primary px-2 text-xs text-on-primary"
                      style={{ width: `${Math.max(4, (s.n / top) * 100)}%` }}
                    >
                      {s.n}
                    </div>
                  </div>
                  <div className="w-12 text-right text-text-muted">
                    {Math.round((s.n / top) * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Table head={['Trade', 'Verified', 'Online now', 'Open requests', '']}>
            {d.supply.map((s) => {
              const short = s.verifiedPartners < 2 || s.openRequests > s.onlinePartners * 3;
              return (
                <tr key={s.trade}>
                  <Td>{tradeLabel(s.trade)}</Td>
                  <Td>{s.verifiedPartners}</Td>
                  <Td>{s.onlinePartners}</Td>
                  <Td>{s.openRequests}</Td>
                  <Td>
                    {short ? <span className="text-sm text-danger">Recruit more</span> : null}
                  </Td>
                </tr>
              );
            })}
          </Table>
        </>
      ) : null}
    </>
  );
}
