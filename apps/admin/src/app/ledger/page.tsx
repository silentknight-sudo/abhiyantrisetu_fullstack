'use client';

import { Badge, Notice, PageHeader, Table, Td } from '@/components/ui';
import { $api, errorMessage } from '@/lib/api';
import { rupees } from '@/lib/format';

/** Human names for the ledger's account keys. */
function describe(account: string) {
  if (account === 'razorpay_clearing') return 'Razorpay (money collected, less payouts)';
  if (account === 'platform_revenue') return 'Platform revenue (fees)';
  if (account.startsWith('held:job:')) return `Held for job ${account.slice(9, 17)}…`;
  if (account.startsWith('partner_payable:')) return `Owed to partner ${account.slice(16, 24)}…`;
  return account;
}

export default function Ledger() {
  const b = $api.useQuery('get', '/v1/admin/ledger/balances');
  return (
    <>
      <PageHeader
        title="Ledger"
        lead="Every rupee as balanced double-entry lines; the database refuses edits and deletes. Balance = credits minus debits."
        actions={
          b.data ? (
            <Badge tone={b.data.trialBalancePaise === 0 ? 'success' : 'danger'}>
              {b.data.trialBalancePaise === 0
                ? 'Books balance'
                : `Out of balance by ${rupees(b.data.trialBalancePaise)}`}
            </Badge>
          ) : null
        }
      />
      {b.error ? <Notice>{errorMessage(b.error)}</Notice> : null}
      {b.data ? (
        <Table head={['Account', 'Debits', 'Credits', 'Balance']}>
          {b.data.accounts.map((a) => (
            <tr key={a.account}>
              <Td>
                {describe(a.account)}
                <div className="font-mono text-xs text-text-muted">{a.account}</div>
              </Td>
              <Td>{rupees(a.debitPaise)}</Td>
              <Td>{rupees(a.creditPaise)}</Td>
              <Td className="font-semibold">{rupees(a.balancePaise)}</Td>
            </tr>
          ))}
        </Table>
      ) : null}
    </>
  );
}
