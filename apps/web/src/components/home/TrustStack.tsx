'use client';

import { BadgeCheck, KeyRound, ShieldCheck, Star } from 'lucide-react';
import { motion, useMotionTemplate, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useRef } from 'react';
import { RevealHeading } from '../RevealHeading';
import { SectionLabel } from '../Reveal';

const CARDS = [
  {
    icon: BadgeCheck,
    title: 'Every pro is verified',
    body: 'Aadhaar via DigiLocker, PAN, bank penny-drop and a selfie face match. Contractors and site workers also pass police verification. Badges show exactly which checks passed.',
    chips: ['Aadhaar', 'PAN', 'Bank', 'Police check'],
    tone: 'light',
  },
  {
    icon: ShieldCheck,
    title: 'Setu Safe payments',
    body: 'For projects, each milestone payment is held and released only when you approve it with photos. Raise a dispute and the payout stays frozen until our team resolves it.',
    chips: ['Milestones', 'Photo proof', 'Dispute desk'],
    tone: 'navy',
  },
  {
    icon: KeyRound,
    title: 'Work starts with your code',
    body: 'Your pro enters a 4-digit start code on site, so you always know when work has really begun. Wrong tries lock after five.',
    chips: ['4-digit code', 'Live tracking', 'On-time alerts'],
    tone: 'orange',
  },
  {
    icon: Star,
    title: 'Reviews you can believe',
    body: 'Only customers who actually hired a pro can review them. Ratings, response time and acceptance rate decide who sees your requirement first.',
    chips: ['Verified reviews', 'Response time', 'Ranking'],
    tone: 'light',
  },
] as const;

const TONES = {
  light: 'border border-border bg-surface text-navy-700',
  navy: 'bg-navy-700 text-white',
  orange: 'bg-gradient-to-br from-orange-400 to-orange-500 text-navy-800',
} as const;

function Card({
  card,
  index,
  progress,
}: {
  card: (typeof CARDS)[number];
  index: number;
  progress: MotionValue<number>;
}) {
  const Icon = card.icon;
  // Once the next card arrives, this one shrinks back into the stack.
  const start = index / CARDS.length;
  const scale = useTransform(progress, [start, 1], [1, 1 - (CARDS.length - index) * 0.05]);
  // Cards further back darken slightly (opaque, so text behind never shows through).
  const brightness = useTransform(progress, [start, 1], [1, index === CARDS.length - 1 ? 1 : 0.82]);
  const filter = useMotionTemplate`brightness(${brightness})`;
  return (
    <div className="sticky top-0 flex h-screen items-center justify-center px-4 sm:px-6">
      <motion.article
        style={{ scale, filter, top: `calc(${index * 28}px)` }}
        className={`relative w-full max-w-4xl origin-top rounded-[36px] p-8 shadow-[0_40px_80px_-30px_rgba(16,36,52,0.45)] sm:p-12 ${TONES[card.tone]}`}
      >
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
          <span
            className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl ${
              card.tone === 'navy' ? 'bg-orange-400 text-navy-800' : 'bg-navy-700 text-orange-300'
            }`}
          >
            <Icon size={30} />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-[0.25em] uppercase opacity-70">
              0{index + 1} / 0{CARDS.length}
            </p>
            <h3 className="mt-3 font-display text-[clamp(2rem,4vw,3.2rem)] leading-[1.05] font-semibold">
              {card.title}
            </h3>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed opacity-85">{card.body}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {card.chips.map((c) => (
                <span
                  key={c}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
                    card.tone === 'light' ? 'bg-surface-muted text-navy-700' : 'bg-white/15'
                  }`}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.article>
    </div>
  );
}

/** Trust promises as cards that pile up on each other as the visitor scrolls. */
export function TrustStack() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  return (
    <section id="trust" ref={ref} className="relative bg-background">
      <div className="mx-auto max-w-7xl px-4 pt-28 sm:px-6">
        <SectionLabel>Why trust Setu</SectionLabel>
        <RevealHeading
          className="max-w-3xl text-balance text-[clamp(2.4rem,5vw,4rem)] leading-[1.02] text-navy-700"
          text="Four promises,"
          accent="built into every job."
        />
      </div>
      {CARDS.map((card, i) => (
        <Card key={card.title} card={card} index={i} progress={scrollYProgress} />
      ))}
    </section>
  );
}
