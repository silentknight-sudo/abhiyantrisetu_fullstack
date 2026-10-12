'use client';

import { formatINR, quoteTotals } from '@setu/domain';
import { BadgeCheck, Camera, Mic, ShieldCheck, Star } from 'lucide-react';
import {
  AnimatePresence,
  motion,
  useInView,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { STEPS } from '@/lib/content';
import { SectionLabel } from '../Reveal';
import { RevealHeading } from '../RevealHeading';

type Screen = (typeof STEPS)[number]['screen'];

const QUOTES = [
  {
    name: 'Ramesh Kumar',
    rating: 4.8,
    jobs: 212,
    items: [
      { description: 'Labour', quantity: 1, unitPrice: 450_000 },
      { description: 'Material', quantity: 1, unitPrice: 820_000 },
    ],
    gst: true,
  },
  {
    name: 'Shiv Constructions',
    rating: 4.6,
    jobs: 98,
    items: [
      { description: 'Labour', quantity: 1, unitPrice: 520_000 },
      { description: 'Material', quantity: 1, unitPrice: 760_000 },
    ],
    gst: false,
  },
];

function PhoneScreen({ screen }: { screen: Screen }) {
  switch (screen) {
    case 'post':
      return (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-text-muted">New requirement</p>
          <div className="rounded-2xl bg-surface-muted p-3 text-sm">
            Bathroom ki deewar mein seelan aa rahi hai, waterproofing chahiye
          </div>
          <div className="flex gap-2">
            <span className="grid h-16 flex-1 place-items-center rounded-xl bg-navy-100 text-navy-500">
              <Camera size={20} />
            </span>
            <span className="grid h-16 flex-1 place-items-center rounded-xl bg-navy-100 text-navy-500">
              <Camera size={20} />
            </span>
            <span className="grid h-16 flex-1 place-items-center rounded-xl bg-orange-100 text-orange-600">
              <Mic size={20} />
            </span>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3 text-xs">
            <p className="font-semibold text-orange-600">Setu AI</p>
            <p className="mt-1 text-text">
              Looks like seepage from the bathroom above. Suggested: <b>Waterproofing</b>, ~120
              sqft.
            </p>
          </div>
          <div className="rounded-full bg-navy-600 py-3 text-center text-sm font-bold text-white">
            Post to verified pros
          </div>
        </div>
      );
    case 'quotes':
      return (
        <div className="space-y-3">
          <div className="grid place-items-center py-2">
            <div className="relative h-28 w-28">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="absolute inset-0 rounded-full border-2 border-orange-400"
                  animate={{ scale: [0.3, 1.2], opacity: [0.8, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8 }}
                />
              ))}
              <span className="absolute inset-[38%] rounded-full bg-orange-400" />
            </div>
            <p className="mt-2 text-sm font-semibold">Finding pros near Sector Pi</p>
          </div>
          {QUOTES.map((q, i) => (
            <motion.div
              key={q.name}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.4 }}
              className="flex items-center justify-between rounded-2xl border border-border p-3"
            >
              <div>
                <p className="flex items-center gap-1 text-sm font-semibold">
                  {q.name} <BadgeCheck size={14} className="text-success" />
                </p>
                <p className="text-xs text-text-muted">
                  ★ {q.rating} · {q.jobs} jobs
                </p>
              </div>
              <span className="rounded-full bg-success/10 px-2 py-1 text-[10px] font-bold text-success">
                QUOTE IN
              </span>
            </motion.div>
          ))}
        </div>
      );
    case 'compare':
      return (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-text-muted">Compare quotes</p>
          {QUOTES.map((q, i) => {
            const t = quoteTotals(q.items, q.gst ? { rate: 18 } : null);
            return (
              <div
                key={q.name}
                className={`rounded-2xl border p-3 ${i === 0 ? 'border-orange-400 bg-orange-50' : 'border-border'}`}
              >
                <div className="flex justify-between text-sm font-semibold">
                  <span>{q.name}</span>
                  <span>{formatINR(t.total)}</span>
                </div>
                <div className="mt-2 space-y-1 text-xs text-text-muted">
                  {q.items.map((it) => (
                    <div key={it.description} className="flex justify-between">
                      <span>{it.description}</span>
                      <span>{formatINR(it.unitPrice)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span>GST</span>
                    <span>{t.gst ? formatINR(t.gst.totalTax) : '—'}</span>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="flex gap-2">
            <span className="flex-1 rounded-full border border-navy-600 py-2.5 text-center text-xs font-bold text-navy-600">
              Negotiate
            </span>
            <span className="flex-1 rounded-full bg-orange-400 py-2.5 text-center text-xs font-bold text-navy-800">
              Hire Ramesh
            </span>
          </div>
        </div>
      );
    case 'start':
      return (
        <div className="space-y-4 text-center">
          <p className="text-xs font-semibold text-text-muted">Ramesh is on the way · 8 min</p>
          <div className="relative h-28 overflow-hidden rounded-2xl bg-navy-50">
            <svg viewBox="0 0 200 100" className="h-full w-full">
              <path
                d="M10 80 C 60 80, 60 20, 110 30 S 170 60, 190 20"
                fill="none"
                stroke="#ABC2D4"
                strokeWidth="4"
                strokeDasharray="6 6"
              />
              <motion.circle
                r="6"
                fill="#FF9F43"
                animate={{ cx: [10, 110, 190], cy: [80, 30, 20] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
            </svg>
          </div>
          <p className="text-sm">Share this code when work starts</p>
          <div className="flex justify-center gap-2">
            {['4', '7', '1', '9'].map((d, i) => (
              <motion.span
                key={i}
                initial={{ rotateX: 90, opacity: 0 }}
                animate={{ rotateX: 0, opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.12 }}
                className="grid h-14 w-12 place-items-center rounded-xl bg-navy-600 text-2xl font-bold text-white"
              >
                {d}
              </motion.span>
            ))}
          </div>
          <p className="text-[11px] text-text-muted">
            Only your pro can enter it. Wrong tries are locked after 5.
          </p>
        </div>
      );
    case 'pay':
      return (
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
            <ShieldCheck size={14} className="text-success" /> Setu Safe
          </p>
          {[
            ['Surface prep', 'Released', 30],
            ['Membrane coat', 'Approve now', 50],
            ['Tile & finish', 'Held', 20],
          ].map(([t, s, p], i) => (
            <div key={t as string} className="rounded-2xl border border-border p-3">
              <div className="flex justify-between text-sm font-semibold">
                <span>{t}</span>
                <span>{p}%</span>
              </div>
              <p
                className={`mt-1 text-xs font-semibold ${i === 0 ? 'text-success' : i === 1 ? 'text-orange-600' : 'text-text-muted'}`}
              >
                {s}
              </p>
            </div>
          ))}
          <div className="rounded-2xl bg-navy-600 p-3 text-white">
            <p className="text-xs text-navy-200">Rate Ramesh</p>
            <div className="mt-1 flex gap-1 text-orange-400">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} size={18} fill="currentColor" />
              ))}
            </div>
          </div>
        </div>
      );
  }
}

function Step({
  index,
  title,
  body,
  screen,
  onActive,
}: {
  index: number;
  title: string;
  body: string;
  screen: Screen;
  onActive: (i: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-45% 0px -45% 0px' });
  useEffect(() => {
    if (inView) onActive(index);
  }, [inView, index, onActive]);
  return (
    <div ref={ref} className="flex min-h-[70vh] items-center">
      <motion.div
        animate={{ opacity: inView ? 1 : 0.3, x: inView ? 0 : 12 }}
        transition={{ duration: 0.4 }}
      >
        <span className="text-sm font-bold tracking-[0.2em] text-orange-500">
          STEP 0{index + 1}
        </span>
        <h3 className="mt-3 text-[clamp(1.6rem,3.2vw,2.6rem)] leading-tight font-display font-semibold text-navy-700">
          {title}
        </h3>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-text-muted">{body}</p>
        {/* Small screens have no pinned phone, so each step shows its own screen. */}
        <div className="mt-6 max-w-sm rounded-[28px] border border-border bg-surface p-4 shadow-lg lg:hidden">
          <PhoneScreen screen={screen} />
        </div>
      </motion.div>
    </div>
  );
}

export function HowItWorks() {
  const section = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({
    target: section,
    offset: ['start center', 'end center'],
  });
  const draw = useSpring(scrollYProgress, { stiffness: 80, damping: 20 });
  // The phone turns slowly through the section, like it is being shown around.
  const phoneRotateY = useSpring(useTransform(scrollYProgress, [0, 1], [-22, 22]), {
    stiffness: 60,
    damping: 18,
  });
  const phoneRotateX = useTransform(scrollYProgress, [0, 0.5, 1], [10, 2, 10]);

  return (
    <section id="how" ref={section} className="relative bg-surface">
      <div className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <SectionLabel>How it works</SectionLabel>
        <RevealHeading
          className="max-w-3xl text-balance text-[clamp(2.4rem,5vw,4rem)] leading-[1.02] text-navy-700"
          text="From “I need help” to a job well done,"
          accent="in five steps."
        />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_auto_1fr]">
        {/* The bridge: a cable that draws itself as you scroll */}
        <svg
          aria-hidden
          className="pointer-events-none absolute top-0 left-4 h-full w-6 sm:left-6 lg:left-1/2 lg:-translate-x-1/2"
          viewBox="0 0 24 1000"
          preserveAspectRatio="none"
        >
          <line x1="12" y1="0" x2="12" y2="1000" stroke="var(--setu-border)" strokeWidth="2" />
          <motion.line
            x1="12"
            y1="0"
            x2="12"
            y2="1000"
            stroke="#FF9F43"
            strokeWidth="3"
            style={{ pathLength: draw }}
          />
        </svg>

        <div className="pl-10 lg:pl-0">
          {STEPS.map((s, i) => (
            <Step
              key={s.title}
              index={i}
              title={s.title}
              body={s.body}
              screen={s.screen}
              onActive={setActive}
            />
          ))}
        </div>

        <div className="hidden w-6 lg:block" />

        <div className="hidden lg:block">
          <div className="sticky top-[calc(50vh-300px)] flex h-[600px] items-center justify-center">
            <motion.div
              style={{ rotateY: phoneRotateY, rotateX: phoneRotateX, transformPerspective: 1200 }}
              className="relative h-[600px] w-[300px] rounded-[44px] border-[10px] border-navy-800 bg-surface shadow-[0_40px_80px_-20px_rgba(10,24,35,0.45)]"
            >
              <div className="absolute top-2 left-1/2 h-5 w-24 -translate-x-1/2 rounded-full bg-navy-800" />
              <div className="flex h-full flex-col overflow-hidden rounded-[34px] px-4 pt-10 pb-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-display text-base font-semibold text-navy-700">
                    Abhiyantri <span className="text-orange-400">Setu</span>
                  </span>
                  <span className="text-[10px] font-semibold text-text-muted">{active + 1}/5</span>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={STEPS[active]!.screen}
                    initial={{ opacity: 0, y: 24, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -24, scale: 0.97 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <PhoneScreen screen={STEPS[active]!.screen} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
