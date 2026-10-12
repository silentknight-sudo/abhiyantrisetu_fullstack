'use client';

import { Building2, CalendarClock, PhoneCall } from 'lucide-react';
import { motion } from 'motion/react';
import { RevealHeading } from '../RevealHeading';
import { Reveal, SectionLabel } from '../Reveal';

const TOWERS = [
  ['Tower A', 100],
  ['Tower B', 82],
  ['Tower C', 64],
  ['Tower D', 40],
  ['Tower E', 18],
] as const;

export function Societies() {
  return (
    <section id="societies" className="bg-background py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
        <Reveal className="order-2 rounded-[32px] border border-border bg-surface p-6 sm:p-8 lg:order-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs tracking-wider text-text-muted uppercase">
                Exterior repainting
              </p>
              <p className="text-lg font-bold text-navy-600">Gaur Atulyam RWA · 5 towers</p>
            </div>
            <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
              On track
            </span>
          </div>
          <div className="mt-6 space-y-4">
            {TOWERS.map(([name, pct], i) => (
              <div key={name}>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-navy-600">{name}</span>
                  <span className="text-text-muted">{pct}%</span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                    className={`h-full rounded-full ${pct === 100 ? 'bg-success' : 'bg-orange-400'}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </Reveal>
        <div className="order-1 lg:order-2">
          <SectionLabel>Societies, RWAs & builders</SectionLabel>
          <Reveal>
            <RevealHeading
              className="text-balance text-[clamp(2.4rem,5vw,4rem)] leading-[1.02] text-navy-700"
              text="One contact for"
              accent="every tower."
            />
          </Reveal>
          <div className="mt-8 space-y-5">
            {[
              {
                icon: PhoneCall,
                title: 'Single point of contact',
                body: 'A named Setu manager for your society, reachable on WhatsApp.',
              },
              {
                icon: Building2,
                title: 'Tower-wise progress',
                body: 'Track painting, waterproofing or lift work by tower, with photos.',
              },
              {
                icon: CalendarClock,
                title: 'Recurring visits',
                body: 'Plumbing, electrical and pest control on a fixed monthly schedule.',
              },
            ].map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 0.08} className="flex gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-navy-600 text-orange-300">
                  <Icon size={22} />
                </span>
                <div>
                  <p className="font-bold text-navy-600">{title}</p>
                  <p className="mt-1 text-text-muted">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
