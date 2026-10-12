import { describe, expect, it } from 'vitest';
import {
  computeGst,
  formatINR,
  maskPhone,
  normalizeIndianMobile,
  quoteTotals,
  rupeesToPaise,
} from '../src';

describe('GST', () => {
  it('splits 18% into CGST + SGST that sum exactly', () => {
    const g = computeGst(100_001, 18);
    expect(g.cgst + g.sgst).toBe(g.totalTax);
    expect(g.total).toBe(100_001 + g.totalTax);
    expect(g.igst).toBe(0);
  });

  it('uses IGST inter-state', () => {
    expect(computeGst(10_000, 18, true)).toMatchObject({ igst: 1_800, cgst: 0, total: 11_800 });
  });

  it('totals a quote with and without GST', () => {
    const items = [
      { description: 'Tap replacement', quantity: 2, unitPrice: rupeesToPaise(450) },
      { description: 'Visit charge', quantity: 1, unitPrice: rupeesToPaise(199) },
    ];
    expect(quoteTotals(items, null)).toEqual({ subtotal: 109_900, gst: null, total: 109_900 });
    expect(quoteTotals(items, { rate: 18 }).total).toBe(129_682);
  });

  it('rejects fractional paise', () => {
    expect(() => computeGst(10.5, 18)).toThrow();
  });
});

describe('money formatting', () => {
  it('uses Indian grouping', () => {
    expect(formatINR(123_456_789)).toBe('₹12,34,567.89');
    expect(formatINR(50_000_000)).toBe('₹5,00,000');
  });
});

describe('phone', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['09876543210', '+919876543210'],
    ['+91 98765 43210', '+919876543210'],
    ['91-9876543210', '+919876543210'],
  ])('normalises %s', (input, out) => expect(normalizeIndianMobile(input)).toBe(out));

  it.each(['12345', '5876543210', '+1 4155551234', 'abcdefghij'])('rejects %s', (input) =>
    expect(normalizeIndianMobile(input)).toBeNull(),
  );

  it('masks', () => expect(maskPhone('+919876543210')).toBe('+91 98XXXXXX10'));
});
