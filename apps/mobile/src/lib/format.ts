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
