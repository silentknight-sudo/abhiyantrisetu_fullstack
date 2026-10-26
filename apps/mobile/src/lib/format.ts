import { formatINR } from '@setu/domain';
import type { Translate } from './i18n';

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

export function ago(iso: string, t: Translate): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return t('just now');
  if (mins < 60) return t('{n} min ago', { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return t('{n} h ago', { n: hours });
  return t('{n} d ago', { n: Math.round(hours / 24) });
}

export const tradeLabel = (slug: string) =>
  slug
    .replace(/-/g, ' ')
    .replace(/^ac\b/, 'AC')
    .replace(/^\w/, (ch) => ch.toUpperCase());

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
const URGENCY_LABEL = {
  asap: 'Right away',
  today: 'Today',
  this_week: 'This week',
  flexible: 'Flexible',
} as const;

/** A requirement's type-specific details as short readable lines (any request type). */
export function detailLines(details: Record<string, unknown>, t: Translate): string[] {
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
  if (d.urgency) {
    const u = URGENCY_LABEL[d.urgency as keyof typeof URGENCY_LABEL];
    lines.push(t('When: {value}', { value: u ? t(u) : pretty(d.urgency) }));
  }
  if (d.propertyType) lines.push(t('Property: {value}', { value: pretty(d.propertyType) }));
  if (d.scope?.length) lines.push(t('Areas: {value}', { value: d.scope.join(', ') }));
  if (d.areaSqft) lines.push(t('Area: {n} sq ft', { n: d.areaSqft }));
  if (d.topic) lines.push(t('Topic: {value}', { value: pretty(d.topic) }));
  if (d.mode) lines.push(t('Consultation: {value}', { value: pretty(d.mode) }));
  for (const i of d.items ?? []) {
    lines.push(`${i.name}${i.brand ? ` (${i.brand})` : ''}: ${i.quantity} ${i.unit}`);
  }
  if (d.items?.length) lines.push(d.needsUnloading ? t('Supplier unloads') : t('Customer unloads'));
  if (d.deliveryBy) lines.push(t('Deliver by {date}', { date: d.deliveryBy }));
  if (d.equipmentType) {
    lines.push(`${d.quantity && d.quantity > 1 ? `${d.quantity} × ` : ''}${d.equipmentType}`);
    if (d.startDate) {
      lines.push(t('From {date} for {n} days', { date: d.startDate, n: d.durationDays ?? 1 }));
    }
    lines.push(d.withOperator ? t('With operator') : t('Machine only'));
  }
  if (d.spec) lines.push(d.spec);
  return lines;
}

/** Partner verification states, as English message keys. */
export const VERIFICATION_LABEL = {
  pending: 'Pending',
  in_review: 'In review',
  verified: 'Verified',
  rejected: 'Rejected',
  suspended: 'Suspended',
} as const;

/** Trade names, as English message keys (translated with `t`). */
const TRADE_NAMES = {
  plumber: 'Plumber',
  electrician: 'Electrician',
  carpenter: 'Carpenter',
  painter: 'Painter',
  waterproofing: 'Waterproofing',
  'ac-technician': 'AC technician',
  mason: 'Mason',
  tiler: 'Tiler',
  contractor: 'Contractor',
  'interior-designer': 'Interior designer',
  architect: 'Architect',
  'structural-engineer': 'Structural engineer',
  'material-supplier': 'Material supplier',
  'equipment-rental': 'Equipment rental',
} as const;

export function tradeName(slug: string, t: Translate): string {
  const key = TRADE_NAMES[slug as keyof typeof TRADE_NAMES];
  return key ? t(key) : tradeLabel(slug);
}

/** Quote states as the customer sees them, as English message keys. */
export const QUOTE_STATUS_LABEL = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Not chosen',
  withdrawn: 'Withdrawn',
  expired: 'Expired',
} as const;
