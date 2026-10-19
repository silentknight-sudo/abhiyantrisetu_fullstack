'use client';

import { REQUIREMENT_TYPES, type RequirementType } from '@setu/domain';
import { type WaitlistRole, waitlistSignupSchema } from '@setu/schemas';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { track } from '@/lib/analytics';
import { api, ApiError } from '@/lib/api';
import { FLOWS, SECTORS, SITE, TRADES } from '@/lib/content';

const ROLES: { value: WaitlistRole; label: string }[] = [
  { value: 'customer', label: 'I need work done' },
  { value: 'provider', label: "I'm a pro / contractor" },
  { value: 'supplier', label: 'Supplier / rental' },
  { value: 'society', label: 'Society / RWA' },
];

const input =
  'w-full rounded-xl border border-border bg-background px-4 py-3 text-left text-text outline-none transition placeholder:text-text-muted/70 focus:border-orange-400 focus:ring-4 focus:ring-orange-400/15';

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full border px-3.5 py-2 text-sm font-medium transition ${
        on
          ? 'border-orange-400 bg-orange-50 text-orange-600'
          : 'border-border text-text-muted hover:border-navy-300'
      }`}
    >
      {children}
    </button>
  );
}

/** Early-access sign-up. Posts to /v1/waitlist; falls back to WhatsApp if the API is unreachable. */
export function WaitlistForm({
  source,
  defaultInterest,
  defaultRole = 'customer',
}: {
  source: string;
  defaultInterest?: RequirementType;
  defaultRole?: WaitlistRole;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<WaitlistRole>(defaultRole);
  const [sector, setSector] = useState('');
  const [trade, setTrade] = useState('');
  const [interests, setInterests] = useState<RequirementType[]>(
    defaultInterest ? [defaultInterest] : [],
  );
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const [done, setDone] = useState(false);

  const wantsInterests = role === 'customer' || role === 'society';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = waitlistSignupSchema.safeParse({
      name,
      phone,
      role,
      sector: sector || undefined,
      trade: role === 'provider' && trade ? trade : undefined,
      interests: wantsInterests ? interests : [],
      source,
      consent,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]!.message);
      return;
    }
    setBusy(true);
    try {
      await api.joinWaitlist(parsed.data);
      track('waitlist_submitted', { role, sector: sector || null, source });
      setDone(true);
    } catch (err) {
      setUnreachable(err instanceof ApiError && err.status === 0);
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="py-4 text-center"
      >
        <CheckCircle2 size={56} className="mx-auto text-success" />
        <p className="mt-4 font-display text-3xl font-semibold text-navy-700">
          You&apos;re on the list.
        </p>
        <p className="mt-2 text-text-muted">
          We&apos;ll message you on launch day
          {role === 'provider' ? ' with how to get verified and start receiving leads' : ''}.
        </p>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={submit}
      onChange={() => error && setError(null)}
      className="space-y-4 text-left"
      noValidate
    >
      <div className="flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <Chip key={r.value} on={role === r.value} onClick={() => setRole(r.value)}>
            {r.label}
          </Chip>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          id="wl-name"
          className={input}
          placeholder="Your name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Your name"
        />
        <input
          id="wl-phone"
          className={input}
          placeholder="Mobile number"
          inputMode="tel"
          autoComplete="tel-national"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/[^\d +]/g, ''))}
          aria-label="Mobile number"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          id="wl-sector"
          className={input}
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          aria-label="Sector"
        >
          <option value="">Your sector (optional)</option>
          {SECTORS.map((s) => (
            <option key={s.slug} value={s.name}>
              {s.name}
            </option>
          ))}
          <option value="Other">Other area</option>
        </select>
        {role === 'provider' && (
          <select
            id="wl-trade"
            className={input}
            value={trade}
            onChange={(e) => setTrade(e.target.value)}
            aria-label="Your trade"
          >
            <option value="">Your trade</option>
            {TRADES.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
            <option value="mason">Mason</option>
            <option value="contractor">Contractor</option>
            <option value="other">Other</option>
          </select>
        )}
      </div>
      {wantsInterests && (
        <div>
          <p className="mb-2 text-sm font-semibold text-navy-700">Interested in</p>
          <div className="flex flex-wrap gap-2">
            {REQUIREMENT_TYPES.map((t) => {
              const label = FLOWS.find((f) => f.type === t)?.title ?? t;
              const on = interests.includes(t);
              return (
                <Chip
                  key={t}
                  on={on}
                  onClick={() =>
                    setInterests((cur) => (on ? cur.filter((x) => x !== t) : [...cur, t]))
                  }
                >
                  {label}
                </Chip>
              );
            })}
          </div>
        </div>
      )}
      <label className="flex items-start gap-3 text-sm text-text-muted">
        <input
          id="wl-consent"
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 accent-orange-500"
        />
        <span>
          I agree to be contacted by Abhiyantri Setu about the launch on WhatsApp, SMS or calls. You
          can ask us to delete your details any time at {SITE.email}.
        </span>
      </label>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">
          {error}
          {unreachable && (
            <>
              {' '}
              <a
                className="underline"
                href={`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent('Hi Abhiyantri Setu, please add me to the early-access list.')}`}
                target="_blank"
                rel="noreferrer"
              >
                Message us on WhatsApp instead.
              </a>
            </>
          )}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-navy-700 px-6 py-3.5 font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
      >
        {busy && <Loader2 size={16} className="animate-spin" />}
        Get early access
      </button>
    </form>
  );
}
