'use client';

import { Badge, Button, Empty, Notice, PageHeader, Table, Td } from '@/components/ui';
import { $api, errorMessage, queryClient } from '@/lib/api';
import { rupees, when } from '@/lib/format';
import { useSession } from '@/lib/session';

const STATUS = {
  requested: ['Not sent yet', 'warning'],
  sending: ['Sending', 'info'],
  initiated: ['With the bank', 'info'],
  processed: ['Refunded', 'success'],
  failed: ['Failed', 'danger'],
} as const;

export default function Refunds() {
  const { can } = useSession();
  const list = $api.useQuery('get', '/v1/admin/refunds');
  const retry = $api.useMutation('post', '/v1/admin/refunds/{id}/retry', {
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['get', '/v1/admin/refunds'] });
      void queryClient.invalidateQueries({ queryKey: ['get', '/v1/admin/overview'] });
    },
  });
  return (
    <>
      <PageHeader
        title="Refunds"
        lead="When a paid job is cancelled, or a dispute is resolved as a refund, the customer's payment goes back to their original method through Razorpay (usually 5–7 working days). Failed refunds stay here until retried."
      />
      {list.error || retry.error ? (
        <Notice>{errorMessage(list.error ?? retry.error)}</Notice>
      ) : null}
      {list.data?.length === 0 ? <Empty>No refunds yet.</Empty> : null}
      {list.data?.length ? (
        <Table head={['Job', 'Customer', 'Amount', 'Why', 'Started', 'Status', '']}>
          {list.data.map((r) => {
            const [label, tone] = STATUS[r.status];
            return (
              <tr key={r.id}>
                <Td className="font-semibold">{r.title}</Td>
                <Td>
                  {r.customerName ?? '—'}
                  <div className="text-xs text-text-muted">{r.customerPhone}</div>
                </Td>
                <Td>{rupees(r.amountPaise)}</Td>
                <Td>{r.reason}</Td>
                <Td>{when(r.createdAt)}</Td>
                <Td>
                  <Badge tone={tone}>{label}</Badge>
                  {r.failureReason ? (
                    <div className="mt-1 max-w-56 text-xs text-danger">{r.failureReason}</div>
                  ) : null}
                  {r.razorpayRefundId ? (
                    <div className="mt-1 font-mono text-xs text-text-muted">
                      {r.razorpayRefundId}
                    </div>
                  ) : null}
                </Td>
                <Td>
                  {can('finance') && (r.status === 'failed' || r.status === 'requested') ? (
                    <Button
                      kind="outline"
                      busy={retry.isPending && retry.variables?.params.path.id === r.id}
                      onClick={() => retry.mutate({ params: { path: { id: r.id } } })}
                    >
                      Retry
                    </Button>
                  ) : null}
                </Td>
              </tr>
            );
          })}
        </Table>
      ) : null}
    </>
  );
}
