/**
 * All money is integer paise. Never use floating-point rupees in business logic.
 */
export type Paise = number;

export function rupeesToPaise(rupees: number): Paise {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: Paise): number {
  return paise / 100;
}

/** Indian digit grouping: 123456789 paise → "₹12,34,567.89". */
export function formatINR(paise: Paise, opts: { decimals?: boolean } = {}): string {
  const decimals = opts.decimals ?? paise % 100 !== 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(paise / 100);
}

/** Round half away from zero to whole paise. */
export function roundPaise(value: number): Paise {
  return Math.sign(value) * Math.round(Math.abs(value));
}
