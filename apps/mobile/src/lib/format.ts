import { formatINR, t } from '@setu/domain';

const en = t('en');

export const rupees = (paise: number) => formatINR(paise, { decimals: false });

export function when(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export const tradeLabel = (slug: string) =>
  slug
    .replace(/-/g, ' ')
    .replace(/^ac\b/, 'AC')
    .replace(/^\w/, (ch) => ch.toUpperCase());

export const jobStateLabel = (s: keyof typeof en.jobState) => en.jobState[s];
export const requirementStatusLabel = (s: keyof typeof en.requirementStatus) =>
  en.requirementStatus[s];
export const requirementTypeLabel = (s: keyof typeof en.requirementType) => en.requirementType[s];

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export function jobTone(state: string): Tone {
  if (state === 'closed') return 'success';
  if (state === 'disputed' || state === 'cancelled') return 'danger';
  if (state === 'completed') return 'warning';
  return 'info';
}

export function requirementTone(status: string): Tone {
  if (status === 'hired' || status === 'closed') return 'success';
  if (status === 'cancelled' || status === 'expired') return 'danger';
  if (status === 'quoted') return 'warning';
  return 'info';
}

/** Lead status as the partner sees it: label and badge tone. */
export const LEAD_STATUS = {
  sent: ['New', 'info'],
  seen: ['Seen', 'neutral'],
  quoted: ['Quoted', 'success'],
  declined: ['Declined', 'danger'],
  expired: ['Expired', 'danger'],
} as const;

const pretty = (v: unknown) => String(v).replace(/_/g, ' ');
const URGENCY_LABEL: Record<string, string> = {
  asap: 'right away',
  today: 'today',
  this_week: 'this week',
  flexible: 'flexible',
};

/** A requirement's type-specific details as short readable lines (any request type). */
export function detailLines(details: Record<string, unknown>): string[] {
  const d = details as {
    urgency?: string;
    propertyType?: string;
    scope?: string[];
    areaSqft?: number;
    topic?: string;
    mode?: string;
    items?: { name: string; quantity: number; unit: string; brand?: string }[];
    needsUnloading?: boolean;
    deliveryBy?: string;
    equipmentType?: string;
    quantity?: number;
    startDate?: string;
    durationDays?: number;
    withOperator?: boolean;
    spec?: string;
  };
  const lines: string[] = [];
  if (d.urgency) lines.push(`When: ${URGENCY_LABEL[d.urgency] ?? pretty(d.urgency)}`);
  if (d.propertyType) lines.push(`Property: ${pretty(d.propertyType)}`);
  if (d.scope?.length) lines.push(`Areas: ${d.scope.join(', ')}`);
  if (d.areaSqft) lines.push(`Area: ${d.areaSqft} sq ft`);
  if (d.topic) lines.push(`Topic: ${pretty(d.topic)}`);
  if (d.mode) lines.push(`Consultation: ${pretty(d.mode)}`);
  for (const i of d.items ?? []) {
    lines.push(`${i.name}${i.brand ? ` (${i.brand})` : ''}: ${i.quantity} ${i.unit}`);
  }
  if (d.items?.length) lines.push(d.needsUnloading ? 'Supplier unloads' : 'Customer unloads');
  if (d.deliveryBy) lines.push(`Deliver by ${d.deliveryBy}`);
  if (d.equipmentType) {
    lines.push(`${d.quantity && d.quantity > 1 ? `${d.quantity} × ` : ''}${d.equipmentType}`);
    if (d.startDate)
      lines.push(`From ${d.startDate} for ${d.durationDays} day${d.durationDays === 1 ? '' : 's'}`);
    lines.push(d.withOperator ? 'With operator' : 'Machine only');
  }
  if (d.spec) lines.push(d.spec);
  return lines;
}
