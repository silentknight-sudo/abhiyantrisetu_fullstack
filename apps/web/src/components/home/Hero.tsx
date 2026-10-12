'use client';

import { ArrowDown } from 'lucide-react';
import { motion, useScroll, useTransform, type MotionValue } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';
import { FLOWS } from '@/lib/content';
import { HeroScene, SceneSlot } from '../three/Scenes';

const ease = [0.22, 1, 0.36, 1] as const;

/** Rolling sand-coloured land under the 3D scene. */
function Hills() {
  return (
    <svg viewBox="0 0 1440 220" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
      <path d="M0 150 C 240 90, 420 110, 640 140 S 1080 80, 1440 120 V220 H0 Z" fill="#EADBC3" />
      <path d="M0 180 C 300 140, 520 150, 760 175 S 1200 150, 1440 165 V220 H0 Z" fill="#DCC6A3" />
    </svg>
  );
}

/** Static logo emblem, shown instead of the 3D scene on devices without WebGL. */
function Emblem({ rotate }: { rotate: MotionValue<number> }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, ease }}
      className="relative mx-auto aspect-square w-full max-w-[440px]"
    >
      <motion.div
        style={{ rotate }}
        className="absolute inset-0 rounded-full border-[3px] border-navy-600/80"
      />
      <div className="absolute inset-[14px] rounded-full border border-navy-600/40" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <Image
            src="/logo.png"
            alt="Abhiyantri Setu"
            width={334}
            height={190}
            priority
            className="mx-auto w-[64%]"
          />
          <p className="mt-4 font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-none font-semibold tracking-[0.08em] text-navy-700 uppercase">
            Abhiyantri <span className="font-medium">Setu</span>
          </p>
          <p className="mt-2 text-sm tracking-[0.3em] text-sand-600">अभियंत्री सेतु</p>
        </div>
      </div>
    </motion.div>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const hillsY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const emblemRotate = useTransform(scrollYProgress, [0, 1], [0, 18]);

  return (
    <section ref={ref} className="relative isolate overflow-hidden bg-background pt-[72px]">
      <div
        aria-hidden
        className="absolute top-24 right-[12%] -z-10 h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(255,159,67,0.28),rgba(255,159,67,0))]"
      />

      <motion.div
        style={{ y: contentY }}
        className="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-12 pb-48 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:pt-16 lg:pb-52"
      >
        {/* Copy */}
        <div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="text-sm font-semibold tracking-[0.3em] text-orange-600 uppercase"
          >
            Greater Noida · Noida Extension
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="mt-5 text-[clamp(2.5rem,5.2vw,4.7rem)] leading-[1.02] text-navy-700"
          >
            Build, Renovate,
            <br />
            <em>Repair &amp; Maintain.</em>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease }}
            className="mt-7 max-w-xl text-lg leading-relaxed text-text-muted sm:text-xl"
          >
            Verified plumbers, contractors and engineers, building materials and equipment, with
            quotes in 24 hours and payments released only when each milestone is done.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45, ease }}
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <Link
              href="/post"
              className="inline-flex items-center justify-center rounded-full bg-navy-700 px-8 py-4 text-base font-semibold text-white shadow-[0_14px_30px_-12px_rgba(16,36,52,0.55)] transition hover:-translate-y-0.5 hover:bg-navy-800"
            >
              Post a requirement
            </Link>
            <Link
              href="#how"
              className="inline-flex items-center justify-center rounded-full border-2 border-navy-700/70 px-8 py-4 text-base font-semibold text-navy-700 transition hover:bg-navy-700 hover:text-white"
            >
              See how it works
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-muted"
          >
            {FLOWS.map((f) => (
              <Link
                key={f.id}
                href={`/post?type=${f.type}`}
                className="underline-offset-4 transition hover:text-navy-700 hover:underline"
              >
                {f.title}
              </Link>
            ))}
          </motion.div>
        </div>

        {/* 3D bridge and city; the camera orbits as the visitor scrolls */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease }}
          className="relative -mx-4 h-[380px] sm:h-[480px] lg:mx-0 lg:h-[600px]"
        >
          <SceneSlot
            // Soft edges so the 3D ground melts into the page instead of ending in a box.
            className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_62%,transparent_88%)]"
            fallback={<Emblem rotate={emblemRotate} />}
          >
            {(active) => <HeroScene progress={scrollYProgress} active={active} />}
          </SceneSlot>
          <div className="pointer-events-none absolute inset-x-2 top-4 flex justify-between gap-3 sm:inset-x-6 lg:top-[16%]">
            <div className="rounded-2xl border border-border bg-surface/90 px-4 py-2 shadow-sm backdrop-blur">
              <p className="font-display text-lg leading-tight font-semibold text-navy-700">
                Service providers
              </p>
              <p className="text-xs text-text-muted">Verified pros and suppliers</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface/90 px-4 py-2 text-right shadow-sm backdrop-blur">
              <p className="font-display text-lg leading-tight font-semibold text-navy-700">
                Clients
              </p>
              <p className="text-xs text-text-muted">Homes, societies, builders</p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        style={{ y: hillsY }}
        className="absolute inset-x-0 bottom-0 -z-10 h-[180px] sm:h-[220px]"
      >
        <Hills />
      </motion.div>
      <a
        href="#services"
        className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 text-sm tracking-[0.12em] text-navy-700/80"
      >
        Scroll to explore <ArrowDown size={14} />
      </a>
    </section>
  );
}
