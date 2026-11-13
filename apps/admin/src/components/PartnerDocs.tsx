'use client';

import { useState } from 'react';
import { Badge, Button, Notice, inputCls } from './ui';
import { $api, errorMessage, queryClient } from '@/lib/api';

const LABEL: Record<string, string> = {
  aadhaar: 'Aadhaar',
  pan: 'PAN',
  selfie: 'Selfie',
  bank_account: 'Bank / UPI',
  police_verification: 'Police verification',
  gst_certificate: 'GST certificate',
  other: 'Certificate / work photos',
};
const TONE = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  expired: 'danger',
} as const;

/** One partner's documents: view each file, approve, or reject with a reason. */
export function PartnerDocs({ partnerId }: { partnerId: string }) {
  const docs = $api.useQuery('get', '/v1/admin/partners/{id}/documents', {
    params: { path: { id: partnerId } },
  });
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const review = $api.useMutation('post', '/v1/admin/documents/{id}/review', {
    onSuccess: () => {
      setRejecting(null);
      setNote('');
      void queryClient.invalidateQueries({
        queryKey: ['get', '/v1/admin/partners/{id}/documents'],
      });
    },
  });
  if (docs.isPending) return <p className="text-sm text-text-muted">Loading documents…</p>;
  if (!docs.data) return <Notice>{errorMessage(docs.error)}</Notice>;
  const d = docs.data;
  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface-muted p-3">
      <div className="text-sm">
        <b>Needed:</b> {d.required.map((k) => LABEL[k] ?? k).join(', ')}
        {d.missing.length ? (
          <span className="ml-2 text-danger">
            Missing: {d.missing.map((k) => LABEL[k] ?? k).join(', ')}
          </span>
        ) : (
          <span className="ml-2 text-success">All uploaded</span>
        )}
      </div>
      {d.documents.length === 0 ? (
        <p className="text-sm text-text-muted">Nothing uploaded yet.</p>
      ) : null}
      {d.documents.map((doc) => (
        <div
          key={doc.id}
          className="flex flex-wrap items-center gap-2 border-t border-border pt-2 text-sm"
        >
          <b className="min-w-40">{LABEL[doc.kind] ?? doc.kind}</b>
          <Badge tone={TONE[doc.status]}>{doc.status}</Badge>
          {doc.expiresOn ? <span className="text-text-muted">expires {doc.expiresOn}</span> : null}
          {doc.url ? (
            <a className="underline" href={doc.url} target="_blank" rel="noreferrer">
              View file
            </a>
          ) : null}
          {doc.note ? <span className="text-text-muted">“{doc.note}”</span> : null}
          <span className="flex-1" />
          {rejecting === doc.id ? (
            <>
              <input
                className={`${inputCls} max-w-64`}
                placeholder="Why is it rejected?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                autoFocus
              />
              <Button
                kind="danger"
                busy={review.isPending}
                disabled={note.trim().length < 3}
                onClick={() =>
                  review.mutate({
                    params: { path: { id: doc.id } },
                    body: { status: 'rejected', note: note.trim() },
                  })
                }
              >
                Reject
              </Button>
              <Button kind="outline" onClick={() => setRejecting(null)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              {doc.status !== 'approved' ? (
                <Button
                  busy={review.isPending && review.variables?.params.path.id === doc.id}
                  onClick={() =>
                    review.mutate({
                      params: { path: { id: doc.id } },
                      body: { status: 'approved' },
                    })
                  }
                >
                  Approve
                </Button>
              ) : null}
              {doc.status !== 'rejected' ? (
                <Button kind="outline" onClick={() => setRejecting(doc.id)}>
                  Reject
                </Button>
              ) : null}
            </>
          )}
        </div>
      ))}
      {review.error ? <Notice>{errorMessage(review.error)}</Notice> : null}
    </div>
  );
}

/** Documents expiring in the next 30 days (or already expired), soonest first. */
export function ExpiringDocs() {
  const list = $api.useQuery('get', '/v1/admin/documents/expiring', {
    params: { query: { days: 30 } },
  });
  if (!list.data?.length) return null;
  return (
    <div className="mb-4 rounded-lg border border-border bg-surface p-3">
      <div className="mb-2 font-semibold">Documents expiring in 30 days · {list.data.length}</div>
      {list.data.map((d) => (
        <div key={d.id} className="flex flex-wrap gap-2 text-sm">
          <b>{d.partnerName}</b>
          <span>{LABEL[d.kind] ?? d.kind}</span>
          <Badge tone={(d.expiresInDays ?? 0) < 0 ? 'danger' : 'warning'}>
            {(d.expiresInDays ?? 0) < 0
              ? `expired ${-(d.expiresInDays ?? 0)} days ago`
              : `in ${d.expiresInDays} days`}
          </Badge>
          <a className="underline" href={`tel:${d.phone}`}>
            {d.phone}
          </a>
        </div>
      ))}
    </div>
  );
}
