import type { IconName } from '@/components/ui';

/** One icon per request type, used on tiles and list cards. */
export const TYPE_ICON: Record<string, IconName> = {
  service: 'construct',
  renovation: 'hammer',
  consult: 'compass',
  material_rfq: 'cube',
  equipment: 'car',
};
