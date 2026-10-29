'use client';

import { motion, useScroll, useTransform } from 'motion/react';
import Image from 'next/image';
import { useRef } from 'react';
import { SectionLabel } from '../Reveal';
import { GlassHouseScene, SceneSlot } from '../three/Scenes';

const STEPS = [
  { at: 0.05, label: 'Foundation & plinth' },
  { at: 0.3, label: 'Ground and first floor' },
  { at: 0.6, label: 'Upper floors & glazing' },
  { at: 0.85, label: 'Roof & finishing' },
];

/**
 * A sticky, scroll-driven section: the glass house from the Setu photo builds itself in 3D
 * from the foundation up, then dissolves into the finished photograph.
 */
export function DreamHome() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const build = useTransform(scrollYProgress, [0, 0.85], [0, 1]);
  const photo = useTransform(scrollYProgress, [0.86, 0.98], [0, 1]);
  const pct = useTransform(build, (v) => `${Math.round(v * 100)}%`);

  return (
    <section ref={ref} id="dream-home" className="relative h-[320vh] bg-[#1b1a22]">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* sunset sky behind the transparent 3D canvas */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#f7c99a] via-[#f29a54] to-[#5a3a3a]" />
        <SceneSlot
          className="absolute inset-0"
          fallback={
            <Image
              src="/projects/hero-house.jpg"
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
            />
          }
        >
          {(active) => <GlassHouseScene progress={build} active={active} />}
        </SceneSlot>
        <motion.div style={{ opacity: photo }} className="absolute inset-0">
          <Image
            src="/projects/hero-house.jpg"
            alt="A finished modern glass house at sunset"
            fill
            className="object-cover"
            sizes="100vw"
          />
        </motion.div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pt-24 pb-10 sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-6 text-white">
            <div>
              <SectionLabel dark>From foundation to handover</SectionLabel>
              <h2 className="text-balance text-[clamp(2rem,4.6vw,3.6rem)] leading-[1.05]">
                Your dream home, <em>built floor by floor.</em>
              </h2>
              <p className="mt-3 max-w-lg text-white/80">
                Scroll to watch it rise. Every stage is inspected and photographed before you pay
                for it.
              </p>
            </div>
            <div className="min-w-56">
              <p className="text-sm tracking-[0.18em] text-white/70 uppercase">Built</p>
              <motion.p className="font-display text-5xl font-bold tabular-nums">{pct}</motion.p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {STEPS.map((s) => (
                  <Step key={s.label} at={s.at} label={s.label} build={build} />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Step({
  at,
  label,
  build,
}: {
  at: number;
  label: string;
  build: ReturnType<typeof useTransform<number, number>>;
}) {
  const opacity = useTransform(build, [at - 0.05, at], [0.45, 1]);
  return (
    <motion.li style={{ opacity }} className="flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full bg-orange-400" /> {label}
    </motion.li>
  );
}
