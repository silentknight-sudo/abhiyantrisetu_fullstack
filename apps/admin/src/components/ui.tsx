import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function PageHeader({
  title,
  lead,
  actions,
}: {
  title: string;
  lead?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl font-semibold text-text">{title}</h1>
        {lead ? <p className="mt-1 max-w-2xl text-sm text-text-muted">{lead}</p> : null}
      </div>
      {actions}
    </div>
  );
}

type Kind = 'primary' | 'accent' | 'outline' | 'danger';
const KIND: Record<Kind, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  accent: 'bg-accent text-on-accent hover:brightness-95',
  outline: 'border border-border bg-surface text-text hover:bg-surface-muted',
  danger: 'bg-danger text-white hover:brightness-95',
};

export function Button({
  kind = 'primary',
  busy,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { kind?: Kind; busy?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || busy}
      className={`inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-sm font-semibold transition disabled:opacity-50 ${KIND[kind]} ${className}`}
    >
      {busy ? 'Working…' : children}
    </button>
  );
}

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
const TONE: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-text',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-text',
  danger: 'bg-danger-bg text-danger',
  info: 'bg-info-bg text-info',
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${TONE[tone]}`}>
      {children}
    </span>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-surface p-5 ${className}`}>{children}</div>
  );
}

export function Stat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  href?: string;
}) {
  const body = (
    <>
      <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1 font-display text-3xl font-semibold text-text">{value}</div>
      {hint ? <div className="mt-1 text-xs text-text-muted">{hint}</div> : null}
    </>
  );
  return href ? (
    <Link
      href={href}
      className="block rounded-xl border border-border bg-surface p-5 transition hover:border-primary"
    >
      {body}
    </Link>
  ) : (
    <Card>{body}</Card>
  );
}

export function Notice({
  children,
  tone = 'danger',
}: {
  children: ReactNode;
  tone?: 'danger' | 'info' | 'success';
}) {
  const cls = {
    danger: 'bg-danger-bg text-danger',
    info: 'bg-info-bg text-info',
    success: 'bg-success-bg text-success',
  }[tone];
  return (
    <div role="alert" className={`rounded-lg px-3 py-2 text-sm ${cls}`}>
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-text-muted">
      {children}
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}

export const inputCls =
  'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:border-primary';
