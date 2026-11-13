/**
 * Sample Greater Noida market rates for materials and equipment rental, used for the
 * estimates customers see before sending an RFQ or a rental request. Suppliers and owners
 * quote their own live prices; review these before launch. Amounts in paise.
 */
export interface MaterialRate {
  key: string;
  name: string;
  unit: 'bag' | 'kg' | 'tonne' | 'cft' | 'cum' | 'sqft' | 'piece' | 'litre' | 'metre' | 'truck';
  ratePaise: number;
  brands: readonly string[];
}

export const MATERIAL_RATES: readonly MaterialRate[] = [
  {
    key: 'cement-opc53',
    name: 'OPC 53 grade cement',
    unit: 'bag',
    ratePaise: 41_000,
    brands: ['UltraTech', 'ACC', 'Ambuja'],
  },
  {
    key: 'cement-ppc',
    name: 'PPC cement',
    unit: 'bag',
    ratePaise: 38_000,
    brands: ['UltraTech', 'ACC', 'Ambuja'],
  },
  {
    key: 'tmt-fe500d',
    name: 'TMT steel Fe 500D',
    unit: 'tonne',
    ratePaise: 6_200_000,
    brands: ['TATA Tiscon', 'JSW Neosteel', 'SAIL'],
  },
  { key: 'sand-coarse', name: 'Coarse sand (Badarpur)', unit: 'cft', ratePaise: 6_000, brands: [] },
  { key: 'gitti-20', name: '20 mm gitti (aggregate)', unit: 'cft', ratePaise: 5_500, brands: [] },
  { key: 'brick-red', name: 'Red clay bricks', unit: 'piece', ratePaise: 800, brands: [] },
  { key: 'brick-flyash', name: 'Fly ash bricks', unit: 'piece', ratePaise: 600, brands: [] },
  {
    key: 'aac-block',
    name: 'AAC blocks (600×200×150)',
    unit: 'piece',
    ratePaise: 5_500,
    brands: ['Magicrete', 'Biltech'],
  },
  {
    key: 'tile-vitrified',
    name: 'Vitrified tiles 2×2 ft',
    unit: 'sqft',
    ratePaise: 5_500,
    brands: ['Kajaria', 'Somany', 'Johnson'],
  },
  {
    key: 'paint-emulsion',
    name: 'Interior emulsion paint',
    unit: 'litre',
    ratePaise: 26_000,
    brands: ['Asian Paints', 'Berger', 'Nerolac'],
  },
];

export type RentBy = 'hour' | 'day' | 'month' | 'trip';

export interface EquipmentRate {
  key: string;
  name: string;
  rentBy: RentBy;
  ratePaise: number;
}

export const EQUIPMENT_RATES: readonly EquipmentRate[] = [
  { key: 'jcb', name: 'JCB / backhoe loader', rentBy: 'hour', ratePaise: 120_000 },
  { key: 'excavator', name: 'Excavator (Poclain)', rentBy: 'hour', ratePaise: 220_000 },
  { key: 'mixer', name: 'Concrete mixer (1 bag)', rentBy: 'day', ratePaise: 120_000 },
  { key: 'hydra', name: 'Hydra crane', rentBy: 'hour', ratePaise: 150_000 },
  { key: 'scaffolding', name: 'Scaffolding (cup-lock set)', rentBy: 'month', ratePaise: 250_000 },
  { key: 'roller', name: 'Road roller', rentBy: 'day', ratePaise: 900_000 },
  { key: 'dg-set', name: 'DG set (15–62.5 kVA)', rentBy: 'day', ratePaise: 350_000 },
  { key: 'tractor', name: 'Tractor-trolley', rentBy: 'trip', ratePaise: 120_000 },
  { key: 'tanker', name: 'Water tanker', rentBy: 'trip', ratePaise: 90_000 },
];

/** Market-rate value of an RFQ: items matched by name to the rate list; the rest are skipped. */
export function materialsEstimate(items: { name: string; quantity: number }[]) {
  let total = 0;
  let priced = 0;
  for (const i of items) {
    const rate = MATERIAL_RATES.find((r) => r.name.toLowerCase() === i.name.trim().toLowerCase());
    if (rate && i.quantity > 0) {
      total += Math.round(rate.ratePaise * i.quantity);
      priced += 1;
    }
  }
  return { totalPaise: total, pricedItems: priced };
}

/**
 * Rental estimate: hourly machines run `hoursPerDay` (default 8) a day; daily, monthly
 * and per-trip machines are charged per unit of `duration`.
 */
export function equipmentEstimate(
  key: string,
  opts: { quantity: number; duration: number; hoursPerDay?: number },
): number | null {
  const rate = EQUIPMENT_RATES.find((r) => r.key === key);
  if (!rate || opts.quantity <= 0 || opts.duration <= 0) return null;
  const units = rate.rentBy === 'hour' ? opts.duration * (opts.hoursPerDay ?? 8) : opts.duration;
  return rate.ratePaise * units * opts.quantity;
}
