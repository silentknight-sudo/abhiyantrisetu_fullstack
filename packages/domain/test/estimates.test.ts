import { describe, expect, it } from 'vitest';
import { constructionEstimate, paintingEstimate } from '../src/estimates';

describe('estimates', () => {
  it('prices construction per built-up sq ft with a ±10% range', () => {
    const e = constructionEstimate(1200, 2, 'standard');
    expect(e.basePaise).toBe(1200 * 2 * 1950 * 100);
    expect(e.lowPaise).toBe(Math.round(e.basePaise * 0.9));
    expect(e.highPaise).toBe(Math.round(e.basePaise * 1.1));
    expect(e.split.reduce((s, x) => s + x.share, 0)).toBeCloseTo(1);
  });

  it('prices painting on wall area (3.2 × carpet)', () => {
    expect(paintingEstimate(1000, 'basic').basePaise).toBe(3200 * 14 * 100);
  });
});
