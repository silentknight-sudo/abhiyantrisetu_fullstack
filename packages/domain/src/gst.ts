import { roundPaise, type Paise } from './money';

/** GST slabs in percent. Most construction labour/services are 18%. */
export const GST_RATES = [0, 5, 12, 18, 28] as const;
export type GstRate = (typeof GST_RATES)[number];

export interface GstBreakdown {
  taxable: Paise;
  rate: GstRate;
  /** Intra-state supply: CGST + SGST, each half the rate. */
  cgst: Paise;
  sgst: Paise;
  /** Inter-state supply: IGST at the full rate. */
  igst: Paise;
  totalTax: Paise;
  total: Paise;
}

/**
 * GST on a taxable amount. `interState` is true when the supplier's state differs from
 * the place of supply. CGST/SGST are computed separately so they always sum exactly.
 */
export function computeGst(taxable: Paise, rate: GstRate, interState = false): GstBreakdown {
  if (!Number.isInteger(taxable)) throw new Error('taxable must be integer paise');
  if (interState) {
    const igst = roundPaise((taxable * rate) / 100);
    return { taxable, rate, cgst: 0, sgst: 0, igst, totalTax: igst, total: taxable + igst };
  }
  const half = roundPaise((taxable * rate) / 200);
  return {
    taxable,
    rate,
    cgst: half,
    sgst: half,
    igst: 0,
    totalTax: half * 2,
    total: taxable + half * 2,
  };
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: Paise;
}

export interface QuoteTotals {
  subtotal: Paise;
  gst: GstBreakdown | null;
  total: Paise;
}

/**
 * Totals for a partner quote. GST applies only when the partner opted in
 * ("Add GST 18%" toggle) — unregistered tradespeople quote without it.
 */
export function quoteTotals(
  items: readonly LineItem[],
  gst: { rate: GstRate; interState?: boolean } | null,
): QuoteTotals {
  const subtotal = items.reduce((sum, i) => sum + roundPaise(i.quantity * i.unitPrice), 0);
  if (!gst) return { subtotal, gst: null, total: subtotal };
  const breakdown = computeGst(subtotal, gst.rate, gst.interState);
  return { subtotal, gst: breakdown, total: breakdown.total };
}
