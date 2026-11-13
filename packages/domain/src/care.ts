/** Care plans (AMC): yearly maintenance with visits Setu books. Sample prices; review before launch. */
export interface CarePlan {
  key: string;
  name: string;
  pricePaise: number;
  visitsPerYear: number;
  includes: readonly string[];
}

export const CARE_PLANS: readonly CarePlan[] = [
  {
    key: 'ac-care',
    name: 'AC care plan',
    pricePaise: 249_900,
    visitsPerYear: 3,
    includes: ['2 services and 1 gas check-up a year', 'Priority visits'],
  },
  {
    key: 'home-care',
    name: 'Home care plan',
    pricePaise: 399_900,
    visitsPerYear: 4,
    includes: ['Plumbing and electrical check every quarter', '10% off repairs'],
  },
  {
    key: 'monsoon-shield',
    name: 'Monsoon shield',
    pricePaise: 199_900,
    visitsPerYear: 1,
    includes: ['Pre-monsoon terrace and bathroom waterproofing inspection', '1 free touch-up'],
  },
  {
    key: 'paint-touchup',
    name: 'Paint touch-up plan',
    pricePaise: 299_900,
    visitsPerYear: 1,
    includes: ['Yearly touch-up of 2 walls', 'Damp spot check'],
  },
];

/** Both sides get this once the referred customer's first job is completed. */
export const REFERRAL_REWARD_PAISE = 25_000;

/** Visit dates spread evenly across the plan year, starting on `startsOn` (yyyy-mm-dd). */
export function careVisits(startsOn: string, visitsPerYear: number): string[] {
  const start = new Date(`${startsOn}T00:00:00Z`);
  return Array.from({ length: visitsPerYear }, (_, i) => {
    const d = new Date(start);
    d.setUTCMonth(d.getUTCMonth() + Math.floor((12 / visitsPerYear) * i));
    return d.toISOString().slice(0, 10);
  });
}
