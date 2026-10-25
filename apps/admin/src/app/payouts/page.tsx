'use client';

import type { components } from '@setu/api-client';
import { recordPayoutSchema } from '@setu/schemas';
import { useState } from 'react';
import { Button, Empty, Notice, PageHeader, Table, Td, inputCls } from '@/components/ui';
import { $api, errorMessage, queryClient } from '@/lib/api';
import { rupees } from '@/lib/format';
import { useSession } from '@/lib/session';

type Due = components['schemas']['PayoutDueDto'];

export default function Payouts() {
  const { can } = useSession();
  const due = $api.useQuery('get', '/v1/admin/payouts');
  const total = (due.data ?? []).reduce((s, d) => s + d.owedPaise, 0);
  return (
    <>
      <PageHeader
        title="Payouts"
        lead={`${rupees(total)} released to partners and not yet paid. Pay by bank transfer or UPI, then record it here with the reference; automated RazorpayX payouts come in Phase 2.`}
      />
      {due.error ? <Notice>{errorMessage(due.error)}</Notice> : null}
      {due.data?.length === 0 ? <Empty>Nothing owed right now.</Empty> : null}
      {due.data?.length ? (
        <Table head={['Partner', 'Phone', 'Owed', can('finance') ? 'Record a payout' : '']}>
          {due.data.map((d) => (
            <Row key={d.partnerId} due={d} canPay={can('finance')} />
          ))}
        </Table>
      ) : null}
    </>
  );
}

function Row({ due, canPay }: { due: Due; canPay: boolean }) {
  const [amount, setAmount] = useState(String(due.owedPaise / 100));
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const pay = $api.useMutation('post', '/v1/admin/payouts', {
    onSuccess: (r) => {
      setDone(`Recorded ${rupees(r.paidPaise)}`);
      setReference('');
      void queryClient.invalidateQueries({ queryKey: ['get', '/v1/admin/payouts'] });
      void queryClient.invalidateQueries({ queryKey: ['get', '/v1/admin/overview'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  function submit() {
    setError(null);
    setDone(null);
    const parsed = recordPayoutSchema.safeParse({
      partnerId: due.partnerId,
      amountPaise: Math.round(Number(amount) * 100),
      reference,
    });
    if (!parsed.success)
      return setError(parsed.error.issues[0]?.message ?? 'Check the amount and reference');
    pay.mutate({ body: parsed.data });
  }

  return (
    <tr>
      <Td className="font-semibold">{due.displayName}</Td>
      <Td>{due.phone}</Td>
      <Td>{rupees(due.owedPaise)}</Td>
      <Td className="min-w-96">
        {canPay ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                className={`${inputCls} w-32`}
                aria-label="Amount in rupees"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
              />
              <input
                className={inputCls}
                aria-label="Bank or UPI reference"
                placeholder="UTR or UPI reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
              <Button busy={pay.isPending} onClick={submit}>
                Record
              </Button>
            </div>
            {error ? <Notice>{error}</Notice> : null}
            {done ? <Notice tone="success">{done}</Notice> : null}
          </div>
        ) : (
          <span className="text-xs text-text-muted">Finance records payouts</span>
        )}
      </Td>
    </tr>
  );
}
