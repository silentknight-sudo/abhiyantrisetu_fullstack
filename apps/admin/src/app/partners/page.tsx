'use client';

import { useState } from 'react';
import { Badge, Button, Empty, Notice, PageHeader, Table, Td, inputCls } from '@/components/ui';
import { $api, errorMessage, queryClient } from '@/lib/api';
import { day, tradeLabel } from '@/lib/format';

const FILTERS = [
  ['pending', 'New'],
  ['in_review', 'Changed profile'],
  ['verified', 'Verified'],
  ['rejected', 'Rejected'],
  ['suspended', 'Suspended'],
] as const;
type Status = (typeof FILTERS)[number][0];
const TONE = {
  pending: 'warning',
  in_review: 'info',
  verified: 'success',
  rejected: 'danger',
  suspended: 'danger',
} as const;

export default function Partners() {
  const [status, setStatus] = useState<Status>('pending');
  const list = $api.useQuery('get', '/v1/admin/partners', { params: { query: { status } } });
  const [acting, setActing] = useState<{ id: string; status: 'rejected' | 'suspended' } | null>(
    null,
  );
  const [reason, setReason] = useState('');
  const verify = $api.useMutation('post', '/v1/admin/partners/{id}/verification', {
    onSuccess: () => {
      setActing(null);
      setReason('');
      void queryClient.invalidateQueries({ queryKey: ['get', '/v1/admin/partners'] });
      void queryClient.invalidateQueries({ queryKey: ['get', '/v1/admin/overview'] });
    },
  });
  const act = (id: string, s: 'verified' | 'rejected' | 'suspended', why?: string) =>
    verify.mutate({
      params: { path: { id } },
      body: { status: s, ...(why ? { reason: why } : {}) },
    });

  return (
    <>
      <PageHeader
        title="Partners"
        lead="Check each partner's documents and call them before verifying. Only verified partners receive leads; every decision is written to the audit log."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(([v, l]) => (
          <button
            key={v}
            onClick={() => setStatus(v)}
            className={`rounded-full border px-3 py-1.5 text-sm ${status === v ? 'border-primary bg-primary text-on-primary' : 'border-border bg-surface'}`}
          >
            {l}
          </button>
        ))}
      </div>
      {list.error || verify.error ? (
        <Notice>{errorMessage(list.error ?? verify.error)}</Notice>
      ) : null}
      {list.data?.length === 0 ? <Empty>No partners here.</Empty> : null}
      {list.data?.length ? (
        <Table head={['Partner', 'Trades', 'Contact', 'Area', 'Joined', 'Status', '']}>
          {list.data.map((p) => (
            <tr key={p.id}>
              <Td>
                <div className="font-semibold">{p.displayName}</div>
                <div className="text-xs text-text-muted">{p.businessName ?? p.ownerName ?? ''}</div>
              </Td>
              <Td>{p.trades.map(tradeLabel).join(', ')}</Td>
              <Td>
                <a className="underline" href={`tel:${p.phone}`}>
                  {p.phone}
                </a>
                {p.gstin ? <div className="text-xs text-text-muted">GSTIN {p.gstin}</div> : null}
              </Td>
              <Td>{p.serviceRadiusKm} km</Td>
              <Td>{day(p.createdAt)}</Td>
              <Td>
                <Badge tone={TONE[p.verificationStatus]}>
                  {p.verificationStatus.replace('_', ' ')}
                </Badge>
              </Td>
              <Td className="min-w-64">
                {acting?.id === p.id ? (
                  <div className="space-y-2">
                    <input
                      className={inputCls}
                      placeholder={
                        acting.status === 'rejected'
                          ? 'Why are we rejecting?'
                          : 'Why are we suspending?'
                      }
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        kind="danger"
                        busy={verify.isPending}
                        disabled={reason.trim().length < 3}
                        onClick={() => act(p.id, acting.status, reason.trim())}
                      >
                        Confirm
                      </Button>
                      <Button kind="outline" onClick={() => setActing(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {p.verificationStatus !== 'verified' ? (
                      <Button
                        busy={verify.isPending && verify.variables?.params.path.id === p.id}
                        onClick={() => act(p.id, 'verified')}
                      >
                        Verify
                      </Button>
                    ) : null}
                    {['pending', 'in_review'].includes(p.verificationStatus) ? (
                      <Button
                        kind="outline"
                        onClick={() => setActing({ id: p.id, status: 'rejected' })}
                      >
                        Reject
                      </Button>
                    ) : null}
                    {p.verificationStatus === 'verified' ? (
                      <Button
                        kind="outline"
                        onClick={() => setActing({ id: p.id, status: 'suspended' })}
                      >
                        Suspend
                      </Button>
                    ) : null}
                  </div>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      ) : null}
    </>
  );
}
