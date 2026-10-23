import { describe, expect, it } from 'vitest';
import { assertBalanced, platformFee, releaseLines } from '../src';

describe('ledger', () => {
  it('accepts balanced transactions', () => {
    expect(() =>
      assertBalanced([
        { account: 'a', debit: 500, credit: 0 },
        { account: 'b', debit: 0, credit: 500 },
      ]),
    ).not.toThrow();
  });

  it.each([
    [
      [
        { account: 'a', debit: 500, credit: 0 },
        { account: 'b', debit: 0, credit: 499 },
      ],
      /Unbalanced/,
    ],
    [
      [
        { account: 'a', debit: 5, credit: 5 },
        { account: 'b', debit: 0, credit: 0 },
      ],
      /either a debit or a credit/,
    ],
    [
      [
        { account: 'a', debit: -5, credit: 0 },
        { account: 'b', debit: 0, credit: -5 },
      ],
      /non-negative/,
    ],
    [
      [
        { account: 'a', debit: 1.5, credit: 0 },
        { account: 'b', debit: 0, credit: 1.5 },
      ],
      /integer/,
    ],
    [[{ account: 'a', debit: 1, credit: 0 }], /at least two/],
  ])('rejects bad transaction %#', (lines, err) => {
    expect(() => assertBalanced(lines)).toThrow(err);
  });

  it('computes fees in basis points, rounding down', () => {
    expect(platformFee(182_900, 0)).toBe(0);
    expect(platformFee(182_900, 500)).toBe(9_145);
    expect(platformFee(999, 333)).toBe(33);
    expect(() => platformFee(100, 10_001)).toThrow();
  });

  it('releases held money to the partner minus the fee', () => {
    expect(releaseLines('j1', 'p1', 100_000, 1_000)).toEqual([
      { account: 'held:job:j1', debit: 100_000, credit: 0 },
      { account: 'partner_payable:p1', debit: 0, credit: 90_000 },
      { account: 'platform_revenue', debit: 0, credit: 10_000 },
    ]);
    expect(releaseLines('j1', 'p1', 100_000, 0)).toHaveLength(2);
  });
});
