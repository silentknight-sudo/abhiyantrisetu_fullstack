import { describe, expect, it } from 'vitest';
import { createRequirementSchema, otpSendSchema, otpVerifySchema } from '../src';

const address = {
  line1: 'Tower B, Flat 1203',
  sector: 'Sector Pi',
  city: 'Greater Noida',
  pincode: '201310',
  location: { lat: 28.4744, lng: 77.504 },
};

describe('auth schemas', () => {
  it('normalises the phone number', () => {
    expect(otpSendSchema.parse({ phone: '98765 43210' })).toEqual({ phone: '+919876543210' });
  });
  it('rejects bad codes', () => {
    expect(otpVerifySchema.safeParse({ phone: '9876543210', code: '12ab56' }).success).toBe(false);
  });
});

describe('createRequirementSchema', () => {
  it('accepts a service requirement with a new address', () => {
    const r = createRequirementSchema.parse({
      type: 'service',
      title: 'Kitchen tap leaking',
      address,
      details: { description: 'Kitchen tap leaks continuously since morning' },
    });
    expect(r.type).toBe('service');
    if (r.type === 'service') expect(r.details.urgency).toBe('flexible');
  });

  it('validates details against the type', () => {
    const res = createRequirementSchema.safeParse({
      type: 'equipment',
      title: 'JCB for foundation',
      address,
      details: { description: 'wrong shape for equipment' },
    });
    expect(res.success).toBe(false);
  });

  it('needs items or a BOQ for material RFQs', () => {
    const base = { type: 'material_rfq', title: 'Cement', address };
    expect(createRequirementSchema.safeParse({ ...base, details: {} }).success).toBe(false);
    expect(
      createRequirementSchema.safeParse({
        ...base,
        details: { items: [{ name: 'OPC 53 cement', quantity: 100, unit: 'bag' }] },
      }).success,
    ).toBe(true);
  });

  it('requires exactly one of addressId / address', () => {
    expect(
      createRequirementSchema.safeParse({
        type: 'consult',
        title: 'Structural check',
        details: { topic: 'structural', description: 'Cracks appearing in the living room beam' },
      }).success,
    ).toBe(false);
  });

  it('rejects inverted budgets', () => {
    expect(
      createRequirementSchema.safeParse({
        type: 'consult',
        title: 'Structural check',
        address,
        budgetMinPaise: 500_000,
        budgetMaxPaise: 100_000,
        details: { topic: 'structural', description: 'Cracks appearing in the living room beam' },
      }).success,
    ).toBe(false);
  });
});
