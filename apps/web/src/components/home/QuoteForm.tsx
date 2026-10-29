'use client';

import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useState } from 'react';
import { SECTORS, SITE } from '@/lib/content';
import { Reveal, SectionLabel } from '../Reveal';

const SERVICES = [
  'Repair & maintenance',
  'Renovation',
  'House construction',
  'Painting',
  'Waterproofing',
  'Building materials',
  'Equipment rental',
  'Expert consultation',
] as const;

const field =
  'w-full rounded-xl border border-border bg-background px-4 py-3 text-navy-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200';

/**
 * Quote request that goes straight to the Setu WhatsApp number: the visitor fills the form
 * and the button opens WhatsApp with the details typed out, ready to send.
 */
export function QuoteForm() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState<string>(SERVICES[0]);
  const [sector, setSector] = useState('');
  const [details, setDetails] = useState('');

  const ready = name.trim().length > 1 && phone.replace(/\D/g, '').length >= 10;
  const message = [
    'Hi Abhiyantri Setu, I would like a quote.',
    `Name: ${name.trim()}`,
    `Phone: ${phone.trim()}`,
    `Service: ${service}`,
    sector ? `Location: ${sector}, Greater Noida` : 'Location: Greater Noida',
    details.trim() ? `Details: ${details.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const href = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`;

  return (
    <section id="quote" className="bg-background py-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <SectionLabel>Get a quote</SectionLabel>
          <h2 className="text-balance text-[clamp(2rem,4.4vw,3.4rem)] leading-[1.05] text-navy-700">
            Tell us the job. <em>We reply on WhatsApp.</em>
          </h2>
          <p className="mt-5 max-w-md text-lg text-text-muted">
            Fill in a few details and send them to our team on WhatsApp. We reply with a quote or a
            free site visit, usually the same day.
          </p>
          <div className="mt-8 space-y-4">
            <p className="text-sm font-bold tracking-[0.18em] text-orange-600 uppercase">
              Connect with us
            </p>
            <a
              href={`https://wa.me/${SITE.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 font-semibold text-navy-700 hover:text-orange-600"
            >
              <Phone size={18} className="text-orange-500" /> {SITE.phone}
            </a>
            <p className="flex items-center gap-3 font-semibold text-navy-700 select-all">
              <Mail size={18} className="text-orange-500" /> {SITE.email}
            </p>
            <p className="flex items-center gap-3 font-semibold text-navy-700">
              <MapPin size={18} className="text-orange-500" /> {SITE.city}, India
            </p>
          </div>
        </div>

        <Reveal className="rounded-[28px] border border-border bg-surface p-6 shadow-[0_30px_80px_-40px_rgba(26,58,82,0.35)] sm:p-8">
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
            <label className="grid gap-1.5 text-sm font-semibold text-navy-600">
              Your name
              <input
                id="quote-name"
                className={field}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="Rohit Sharma"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-navy-600">
              Mobile number
              <input
                id="quote-phone"
                className={field}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                placeholder="98765 43210"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-navy-600">
              Service
              <select
                id="quote-service"
                className={field}
                value={service}
                onChange={(e) => setService(e.target.value)}
              >
                {SERVICES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-navy-600">
              Sector
              <select
                id="quote-sector"
                className={field}
                value={sector}
                onChange={(e) => setSector(e.target.value)}
              >
                <option value="">Choose your sector</option>
                {SECTORS.map((s) => (
                  <option key={s.slug}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-navy-600 sm:col-span-2">
              What needs doing?
              <textarea
                id="quote-details"
                className={`${field} min-h-28`}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="e.g. Seepage on the bathroom wall, about 120 sq ft"
              />
            </label>
            <div className="sm:col-span-2">
              <a
                href={ready ? href : undefined}
                target="_blank"
                rel="noreferrer"
                aria-disabled={!ready}
                className={`flex items-center justify-center gap-2 rounded-full px-6 py-4 font-bold transition ${
                  ready
                    ? 'bg-[#1f9d55] text-white hover:-translate-y-0.5 hover:bg-[#188046]'
                    : 'cursor-not-allowed bg-surface-muted text-text-muted'
                }`}
              >
                <MessageCircle size={18} /> Send quote request on WhatsApp
              </a>
              <p className="mt-3 text-xs text-text-muted">
                {ready
                  ? `Opens WhatsApp with your details ready to send to ${SITE.phone}.`
                  : 'Add your name and a 10-digit mobile number to continue.'}
              </p>
            </div>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
