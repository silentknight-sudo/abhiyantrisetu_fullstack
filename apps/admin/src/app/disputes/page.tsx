'use client';

import type { components } from '@setu/api-client';
import { useState } from 'react';
import { Button, Card, Empty, Notice, PageHeader, inputCls } from '@/components/ui';
import { $api, errorMessage, queryClient } from '@/lib/api';
import { rupees, when } from '@/lib/format';

type AdminJob = components['schemas']['AdminJobDto'];

export default function Disputes() {
  const list = $api.useQuery('get', '/v1/admin/jobs', { params: { query: { state: 'disputed' } } });
  return (
    <>
      <PageHeader
        title="Disputes"
        lead="The customer's payment stays held while a job is disputed. Call both sides, then release the money to the partner or refund the customer."
      />
      {list.error ? <Notice>{errorMessage(list.error)}</Notice> : null}
      {list.data?.length === 0 ? <Empty>No open disputes.</Empty> : null}
      <div className="space-y-4">
        {list.data?.map((j) => (
          <Dispute key={j.id} job={j} />
        ))}
      </div>
    </>
  );
}

function Dispute({ job }: { job: AdminJob }) {
  const path = { params: { path: { id: job.id } } };
  const events = $api.useQuery('get', '/v1/jobs/{id}/events', path);
  const [note, setNote] = useState('');
  const resolve = $api.useMutation('post', '/v1/jobs/{id}/resolve', {
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['get', '/v1/admin/jobs'] });
      void queryClient.invalidateQueries({ queryKey: ['get', '/v1/admin/overview'] });
    },
  });
  const raised = events.data?.find((e) => e.event === 'dispute');
  const reason = (raised?.payload as { reason?: string } | null)?.reason;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold">{job.title}</div>
          <div className="text-sm text-text-muted">
            {rupees(job.agreedTotalPaise)} · disputed {when(job.disputedAt)}
          </div>
        </div>
        <div className="grid gap-1 text-sm sm:grid-cols-2 sm:gap-6">
          <div>
            <div className="text-xs text-text-muted">Customer</div>
            {job.customerName ?? 'No name'} ·{' '}
            <a className="underline" href={`tel:${job.customerPhone}`}>
              {job.customerPhone}
            </a>
          </div>
          <div>
            <div className="text-xs text-text-muted">Partner</div>
            {job.partnerName} ·{' '}
            <a className="underline" href={`tel:${job.partnerPhone}`}>
              {job.partnerPhone}
            </a>
          </div>
        </div>
      </div>
      {reason ? (
        <blockquote className="mt-4 rounded-lg bg-surface-muted px-3 py-2 text-sm">
          “{reason}”
        </blockquote>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          className={`${inputCls} max-w-md flex-1`}
          placeholder="Resolution note (kept on the job's history)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button
          busy={resolve.isPending && resolve.variables?.body.outcome === 'release'}
          disabled={note.trim().length < 3 || resolve.isPending}
          onClick={() =>
            resolve.mutate({ ...path, body: { outcome: 'release', note: note.trim() } })
          }
        >
          Release to partner
        </Button>
        <Button
          kind="danger"
          busy={resolve.isPending && resolve.variables?.body.outcome === 'refund'}
          disabled={note.trim().length < 3 || resolve.isPending}
          onClick={() =>
            resolve.mutate({ ...path, body: { outcome: 'refund', note: note.trim() } })
          }
        >
          Refund customer
        </Button>
      </div>
      <p className="mt-2 text-xs text-text-muted">
        Refund cancels the job and returns the customer's payment to their original method through
        Razorpay automatically; follow it on the Refunds page.
      </p>
      {resolve.error ? (
        <div className="mt-2">
          <Notice>{errorMessage(resolve.error)}</Notice>
        </div>
      ) : null}
    </Card>
  );
}
