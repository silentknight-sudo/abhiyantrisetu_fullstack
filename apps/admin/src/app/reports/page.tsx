'use client';

import { useState } from 'react';
import { Badge, Button, Empty, Notice, PageHeader, Table, Td, inputCls } from '@/components/ui';
import { $api, errorMessage, queryClient } from '@/lib/api';
import { when } from '@/lib/format';

const REASON: Record<string, string> = {
  no_show: 'Did not turn up',
  rude_or_unsafe: 'Rude or unsafe',
  asked_cash_outside_app: 'Asked for cash outside the app',
  poor_work: 'Poor work',
  fake_profile: 'Fake profile',
  other: 'Other',
};
type Status = 'open' | 'actioned' | 'dismissed';

/** Trust & safety: customer reports about professionals. Every decision is audited. */
export default function Reports() {
  const [status, setStatus] = useState<Status>('open');
  const list = $api.useQuery('get', '/v1/admin/reports', { params: { query: { status } } });
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const resolve = $api.useMutation('post', '/v1/admin/reports/{id}/resolve', {
    onSuccess: () => {
      setOpen(null);
      setNote('');
      void queryClient.invalidateQueries({ queryKey: ['get', '/v1/admin/reports'] });
    },
  });
  const act = (id: string, s: 'actioned' | 'dismissed') =>
    resolve.mutate({ params: { path: { id } }, body: { status: s, note: note.trim() } });

  return (
    <>
      <PageHeader
        title="Trust & safety"
        lead="Reports from customers. Call both sides, then record what you did. To stop a professional getting work, suspend them from Users."
      />
      {list.error || resolve.error ? (
        <Notice>{errorMessage(list.error ?? resolve.error)}</Notice>
      ) : null}
      <div className="mb-4 flex flex-wrap gap-2">
        {(['open', 'actioned', 'dismissed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full border px-3 py-1.5 text-sm capitalize ${status === s ? 'border-primary bg-primary text-on-primary' : 'border-border bg-surface'}`}
          >
            {s}
          </button>
        ))}
      </div>
      {list.data?.length === 0 ? <Empty>No {status} reports.</Empty> : null}
      {list.data?.length ? (
        <Table head={['Professional', 'Reason', 'From', 'When', '']}>
          {list.data.map((r) => (
            <tr key={r.id}>
              <Td>
                <div className="font-medium">{r.partnerName}</div>
                {r.openAgainstPartner > 1 ? (
                  <Badge tone="danger">{r.openAgainstPartner} open reports</Badge>
                ) : null}
              </Td>
              <Td>
                <div>{REASON[r.reason] ?? r.reason}</div>
                {r.details ? <div className="text-xs text-text-muted">“{r.details}”</div> : null}
                {r.resolutionNote ? (
                  <div className="text-xs text-text-muted">Outcome: {r.resolutionNote}</div>
                ) : null}
              </Td>
              <Td>{r.reporterPhone}</Td>
              <Td>{when(r.createdAt)}</Td>
              <Td>
                {r.status !== 'open' ? (
                  <Badge tone={r.status === 'actioned' ? 'success' : 'neutral'}>{r.status}</Badge>
                ) : open === r.id ? (
                  <div className="flex min-w-64 flex-col gap-2">
                    <input
                      className={inputCls}
                      placeholder="What did you do?"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        disabled={note.trim().length < 3 || resolve.isPending}
                        onClick={() => act(r.id, 'actioned')}
                      >
                        Mark actioned
                      </Button>
                      <Button
                        kind="outline"
                        disabled={note.trim().length < 3 || resolve.isPending}
                        onClick={() => act(r.id, 'dismissed')}
                      >
                        Dismiss report
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    kind="outline"
                    onClick={() => {
                      setOpen(r.id);
                      setNote('');
                    }}
                  >
                    Resolve
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
