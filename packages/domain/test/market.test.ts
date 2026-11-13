import { describe, expect, it } from 'vitest';
import { equipmentEstimate, MATERIAL_RATES, materialsEstimate } from '../src/market';

describe('materialsEstimate', () => {
  it('prices items on the market list and skips the rest', () => {
    const cement = MATERIAL_RATES.find((r) => r.key === 'cement-opc53')!;
    const e = materialsEstimate([
      { name: 'OPC 53 grade cement', quantity: 100 },
      { name: 'opc 53 GRADE cement ', quantity: 0 },
      { name: 'Something custom', quantity: 5 },
    ]);
    expect(e).toEqual({ totalPaise: cement.ratePaise * 100, pricedItems: 1 });
  });
});

describe('equipmentEstimate', () => {
  it('charges hourly machines per working hour and others per unit', () => {
    expect(equipmentEstimate('jcb', { quantity: 1, duration: 2 })).toBe(120_000 * 16);
    expect(equipmentEstimate('jcb', { quantity: 2, duration: 1, hoursPerDay: 5 })).toBe(
      120_000 * 10,
    );
    expect(equipmentEstimate('mixer', { quantity: 1, duration: 3 })).toBe(360_000);
    expect(equipmentEstimate('tanker', { quantity: 1, duration: 4 })).toBe(360_000);
    expect(equipmentEstimate('nope', { quantity: 1, duration: 1 })).toBeNull();
    expect(equipmentEstimate('jcb', { quantity: 0, duration: 1 })).toBeNull();
  });
});
