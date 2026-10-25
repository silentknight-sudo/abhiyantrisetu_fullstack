import { formatINR, t } from '@setu/domain';

const en = t('en');

export const rupees = (paise: number) => formatINR(paise, { decimals: false });
export const when = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—';
export const day = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
export const jobStateLabel = (s: keyof typeof en.jobState) => en.jobState[s];
export const tradeLabel = (slug: string) =>
  slug
    .replace(/-/g, ' ')
    .replace(/^ac\b/, 'AC')
    .replace(/^\w/, (ch) => ch.toUpperCase());
