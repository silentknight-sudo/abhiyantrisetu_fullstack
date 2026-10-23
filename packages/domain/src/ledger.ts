import type { Paise } from './money';

/**
 * Double-entry ledger rules. Every money movement is a transaction of entries whose debits
 * equal its credits. Entries are append-only: corrections are new transactions.
 */
export const LedgerAccounts = {
  /** Money Razorpay has collected for us and will settle to the bank. */
  gatewayClearing: 'razorpay_clearing',
  /** Customer money held against a job until it closes (Setu Safe in Phase 2). */
  heldForJob: (jobId: string) => `held:job:${jobId}`,
  /** What Setu owes a partner; paid out weekly. */
  partnerPayable: (partnerId: string) => `partner_payable:${partnerId}`,
  platformRevenue: 'platform_revenue',
} as const;

export interface LedgerLine {
  account: string;
  debit: Paise;
  credit: Paise;
}

/** Throws unless every line is one-sided, non-negative integer paise and the set balances. */
export function assertBalanced(lines: readonly LedgerLine[]): void {
  if (lines.length < 2) throw new Error('A ledger transaction needs at least two lines');
  let debits = 0;
  let credits = 0;
  for (const l of lines) {
    if (!Number.isInteger(l.debit) || !Number.isInteger(l.credit) || l.debit < 0 || l.credit < 0) {
      throw new Error('Ledger amounts must be non-negative integer paise');
    }
    if ((l.debit === 0) === (l.credit === 0))
      throw new Error('Each line is either a debit or a credit');
    debits += l.debit;
    credits += l.credit;
  }
  if (debits !== credits) throw new Error(`Unbalanced: debits ${debits} ≠ credits ${credits}`);
}

/** Platform fee in basis points (100 bps = 1%), rounded down to whole paise. */
export function platformFee(amount: Paise, bps: number): Paise {
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000)
    throw new Error('Fee must be 0–10,000 bps');
  return Math.floor((amount * bps) / 10_000);
}

/** Lines for releasing a job's held money: partner gets the rest after the platform fee. */
export function releaseLines(
  jobId: string,
  partnerId: string,
  held: Paise,
  feeBps: number,
): LedgerLine[] {
  const fee = platformFee(held, feeBps);
  const lines: LedgerLine[] = [
    { account: LedgerAccounts.heldForJob(jobId), debit: held, credit: 0 },
    { account: LedgerAccounts.partnerPayable(partnerId), debit: 0, credit: held - fee },
  ];
  if (fee > 0) lines.push({ account: LedgerAccounts.platformRevenue, debit: 0, credit: fee });
  assertBalanced(lines);
  return lines;
}
