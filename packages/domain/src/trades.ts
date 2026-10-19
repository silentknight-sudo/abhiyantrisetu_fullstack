import type { RequirementType } from './requirements';

/** Trades a partner can register for. The partner app's trade picker uses this list. */
export const TRADES = [
  'plumber',
  'electrician',
  'carpenter',
  'painter',
  'waterproofing',
  'ac-technician',
  'mason',
  'tiler',
  'contractor',
  'interior-designer',
  'architect',
  'structural-engineer',
  'material-supplier',
  'equipment-rental',
] as const;

export type Trade = (typeof TRADES)[number];

/** Which trades can serve each catalog category (by category slug). */
export const CATEGORY_TRADES: Record<string, readonly Trade[]> = {
  plumbing: ['plumber'],
  electrical: ['electrician'],
  carpentry: ['carpenter'],
  painting: ['painter', 'contractor'],
  waterproofing: ['waterproofing', 'contractor'],
  'ac-repair': ['ac-technician'],
  'house-construction': ['contractor'],
  renovation: ['contractor', 'mason', 'interior-designer'],
  'modular-kitchen': ['carpenter', 'interior-designer', 'contractor'],
  'flooring-tiling': ['tiler', 'mason', 'contractor'],
  'cement-steel': ['material-supplier'],
  'sand-aggregate': ['material-supplier'],
  'bricks-blocks': ['material-supplier'],
  earthmoving: ['equipment-rental'],
  'concrete-equipment': ['equipment-rental'],
  scaffolding: ['equipment-rental'],
  'structural-engineer': ['structural-engineer'],
  architect: ['architect'],
  'interior-designer': ['interior-designer'],
};

/** Fallback when a requirement has no category. */
export const DEFAULT_TRADES_BY_TYPE: Record<RequirementType, readonly Trade[]> = {
  service: ['plumber', 'electrician', 'carpenter', 'painter', 'ac-technician'],
  renovation: ['contractor', 'mason', 'interior-designer'],
  material_rfq: ['material-supplier'],
  equipment: ['equipment-rental'],
  consult: ['architect', 'structural-engineer', 'interior-designer'],
};

export function tradesFor(type: RequirementType, categorySlug?: string | null): readonly Trade[] {
  return (categorySlug && CATEGORY_TRADES[categorySlug]) || DEFAULT_TRADES_BY_TYPE[type];
}
