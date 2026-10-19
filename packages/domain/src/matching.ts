/**
 * Rule-based partner ranking for lead fan-out. A learned ranking replaces this once there
 * is outcome data (roughly 5,000 jobs); keep the inputs stable so they can be logged.
 */

/** How many partners receive each requirement. */
export const MAX_LEADS_PER_REQUIREMENT = 5;

export interface RankInput {
  distanceKm: number;
  radiusKm: number;
  /** 0–5, null for new partners. */
  rating: number | null;
  ratingCount: number;
  /** Median minutes to respond to a lead, null if unknown. */
  avgResponseMinutes: number | null;
  /** 0–1, null if unknown. */
  acceptanceRate: number | null;
  tier: 'basic' | 'verified' | 'pro';
}

const TIER_SCORE = { basic: 0, verified: 0.6, pro: 1 } as const;

/** Prior used for partners without enough reviews, so newcomers still get leads. */
const NEUTRAL_RATING = 4;
const RATING_CONFIDENCE = 5;

/** Score in [0, 1]; higher is better. */
export function rankScore(p: RankInput): number {
  const proximity = Math.max(0, 1 - p.distanceKm / Math.max(p.radiusKm, 0.1));
  // Bayesian-smoothed rating: few reviews pull towards the neutral prior.
  const r = p.rating ?? NEUTRAL_RATING;
  const smoothed =
    (r * p.ratingCount + NEUTRAL_RATING * RATING_CONFIDENCE) / (p.ratingCount + RATING_CONFIDENCE);
  const rating = smoothed / 5;
  const response = p.avgResponseMinutes == null ? 0.5 : Math.max(0, 1 - p.avgResponseMinutes / 240);
  const acceptance = p.acceptanceRate ?? 0.5;
  const score =
    0.35 * proximity + 0.25 * rating + 0.2 * response + 0.1 * acceptance + 0.1 * TIER_SCORE[p.tier];
  return Math.round(score * 10_000) / 10_000;
}
