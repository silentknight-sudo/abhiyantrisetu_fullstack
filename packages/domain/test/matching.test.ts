import { describe, expect, it } from 'vitest';
import { rankScore, tradesFor, type RankInput } from '../src';

const base: RankInput = {
  distanceKm: 2,
  radiusKm: 10,
  rating: 4.5,
  ratingCount: 40,
  avgResponseMinutes: 20,
  acceptanceRate: 0.8,
  tier: 'verified',
};

describe('rankScore', () => {
  it('prefers closer partners, all else equal', () => {
    expect(rankScore({ ...base, distanceKm: 1 })).toBeGreaterThan(
      rankScore({ ...base, distanceKm: 8 }),
    );
  });
  it('does not let one 5-star review beat a long strong record', () => {
    const newcomer = rankScore({ ...base, rating: 5, ratingCount: 1 });
    const veteran = rankScore({ ...base, rating: 4.8, ratingCount: 120 });
    expect(veteran).toBeGreaterThan(newcomer);
  });
  it('gives brand-new partners a fair middle score', () => {
    const s = rankScore({
      ...base,
      rating: null,
      ratingCount: 0,
      avgResponseMinutes: null,
      acceptanceRate: null,
    });
    expect(s).toBeGreaterThan(0.4);
    expect(s).toBeLessThan(0.8);
  });
  it('stays within [0, 1]', () => {
    expect(rankScore({ ...base, distanceKm: 50 })).toBeGreaterThanOrEqual(0);
    expect(
      rankScore({
        ...base,
        distanceKm: 0,
        rating: 5,
        avgResponseMinutes: 0,
        acceptanceRate: 1,
        tier: 'pro',
      }),
    ).toBeLessThanOrEqual(1);
  });
});

describe('tradesFor', () => {
  it('maps categories to trades and falls back by type', () => {
    expect(tradesFor('service', 'plumbing')).toEqual(['plumber']);
    expect(tradesFor('equipment', null)).toEqual(['equipment-rental']);
    expect(tradesFor('consult', 'unknown-slug')).toContain('architect');
  });
});
