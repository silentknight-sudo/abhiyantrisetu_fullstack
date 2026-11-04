/**
 * Indicative Greater Noida rates for the cost calculators (website and app). Final prices
 * always come from itemised quotes after a site visit.
 */
export const FINISH_TIERS = ['basic', 'standard', 'premium'] as const;
export type FinishTier = (typeof FINISH_TIERS)[number];

/** ₹ per sq ft of built-up area. */
export const BUILD_RATES: Record<FinishTier, number> = {
  basic: 1650,
  standard: 1950,
  premium: 2450,
};

/** ₹ per sq ft of wall. Wall area is about 3.2 × carpet area. */
export const PAINT_RATES: Record<FinishTier, number> = { basic: 14, standard: 20, premium: 30 };

export interface Estimate {
  /** Midpoint, low and high, in paise. */
  basePaise: number;
  lowPaise: number;
  highPaise: number;
  /** Share of the total by part of the work. */
  split: { label: string; share: number }[];
}

const range = (rupees: number) => {
  const base = Math.round(rupees * 100);
  return { basePaise: base, lowPaise: Math.round(base * 0.9), highPaise: Math.round(base * 1.1) };
};

export function constructionEstimate(areaSqft: number, floors: number, tier: FinishTier): Estimate {
  return {
    ...range(areaSqft * floors * BUILD_RATES[tier]),
    split: [
      { label: 'Materials', share: 0.58 },
      { label: 'Labour', share: 0.3 },
      { label: 'Design, approvals & supervision', share: 0.12 },
    ],
  };
}

export function paintingEstimate(carpetSqft: number, tier: FinishTier): Estimate {
  return {
    ...range(Math.round(carpetSqft * 3.2) * PAINT_RATES[tier]),
    split: [
      { label: 'Paint & primer', share: 0.55 },
      { label: 'Labour', share: 0.38 },
      { label: 'Putty & prep', share: 0.07 },
    ],
  };
}
