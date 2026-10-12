'use client';

import { ArrowUpRight, Check, Hammer, HardHat, Package, Truck, Wrench } from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';
import Link from 'next/link';
import { useLayoutEffect, useRef, useState } from 'react';
import { FLOWS, type Flow } from '@/lib/content';
import { SectionLabel } from '../Reveal';

const ICONS = {
  'home-services': Wrench,
  'build-renovate': Hammer,
  'find-pro': HardHat,
  materials: Package,
  equipment: Truck,
} as const;

function FlowCard({ flow, index }: { flow: Flow; index: number }) {
  const Icon = ICONS[flow.id as keyof typeof ICONS];
  const dark = flow.accent === 'navy';
  return (
    <article
      className={`relative flex h-full w-[min(84vw,440px)] shrink-0 flex-col overflow-hidden rounded-[28px] p-8 ${
        dark ? 'bg-navy-600 text-white' : 'border border-border bg-surface text-text'
      }`}
    >
      <span
        className={`absolute -right-6 -top-10 text-[160px] leading-none font-black ${dark ? 'text-white/5' : 'text-navy-600/5'}`}
      >
        0{index + 1}
      </span>
      <span
        className={`grid h-14 w-14 place-items-center rounded-2xl ${dark ? 'bg-orange-400 text-navy-800' : 'bg-navy-600 text-orange-300'}`}
      >
        <Icon size={26} />
      </span>
      <h3 className="mt-8 text-3xl font-extrabold tracking-tight">{flow.title}</h3>
      <p className={`mt-1 text-sm ${dark ? 'text-orange-300' : 'text-orange-600'}`}>{flow.hindi}</p>
      <p className={`mt-4 leading-relaxed ${dark ? 'text-navy-100' : 'text-text-muted'}`}>
        {flow.pitch}
      </p>
      <ul className="mt-6 space-y-2.5">
        {flow.points.map((p) => (
          <li key={p} className="flex items-center gap-2.5 text-sm font-medium">
            <Check size={16} className="text-orange-400" />
            {p}
          </li>
        ))}
      </ul>
      <Link
        href={`/post?type=${flow.type}`}
        className={`mt-auto inline-flex items-center gap-2 self-start rounded-full px-5 py-3 text-sm font-bold transition hover:gap-3 ${
          dark ? 'bg-white text-navy-700' : 'bg-navy-600 text-white'
        }`}
      >
        {flow.cta} <ArrowUpRight size={16} />
      </Link>
    </article>
  );
}

/**
 * Vertical scroll drives a horizontal track while the section is pinned. On small screens
 * the cards simply stack.
 */
export function Flows() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      if (!track.current) return;
      setDistance(Math.max(0, track.current.scrollWidth - window.innerWidth + 48));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (track.current) ro.observe(track.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const x = useTransform(scrollYProgress, [0.05, 0.95], [0, -distance]);
  const bar = useTransform(scrollYProgress, [0.05, 0.95], ['0%', '100%']);

  return (
    <section
      id="services"
      ref={section}
      className="relative bg-background"
      style={{ height: `calc(100vh + ${distance}px)` }}
    >
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <SectionLabel>Five ways to use Setu</SectionLabel>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="max-w-2xl text-balance text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] font-extrabold tracking-[-0.02em] text-navy-600">
              Everything your home needs, <span className="text-orange-500">on one bridge.</span>
            </h2>
            <div className="hidden w-48 md:block">
              <div className="h-1 overflow-hidden rounded-full bg-border">
                <motion.div style={{ width: bar }} className="h-full bg-orange-400" />
              </div>
              <p className="mt-2 text-xs text-text-muted">Keep scrolling →</p>
            </div>
          </div>
        </div>
        <motion.div
          ref={track}
          style={{ x }}
          className="mt-10 flex h-[min(62vh,520px)] gap-6 pl-[max(1rem,calc((100vw-80rem)/2+1.5rem))] pr-6"
        >
          {FLOWS.map((f, i) => (
            <FlowCard key={f.id} flow={f} index={i} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
