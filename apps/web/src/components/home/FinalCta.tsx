'use client';

import { motion, useScroll, useTransform } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';
import { LAUNCHED } from '@/lib/launch';
import { RevealHeading } from '../RevealHeading';

export function FinalCta() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] });
  const scale = useTransform(scrollYProgress, [0, 1], [0.86, 1]);
  const radius = useTransform(scrollYProgress, [0, 1], [56, 32]);
  const rotateX = useTransform(scrollYProgress, [0, 1], [24, 0]);
  return (
    <section ref={ref} className="bg-surface px-4 pb-24 sm:px-6">
      <motion.div
        style={{
          scale,
          borderRadius: radius,
          rotateX,
          transformPerspective: 1200,
          transformOrigin: '50% 100%',
        }}
        className="relative mx-auto max-w-7xl overflow-hidden bg-gradient-to-br from-sand-200 to-sand-300 px-6 py-20 text-center text-navy-700 sm:px-12"
      >
        <span className="mx-auto grid w-fit place-items-center rounded-[28px] bg-white px-6 py-4 shadow-[0_20px_50px_-20px_rgba(10,24,35,0.5)]">
          <Image src="/logo.png" alt="" width={334} height={185} className="w-36" />
        </span>
        {LAUNCHED ? null : (
          <p className="mx-auto mt-8 w-fit rounded-full bg-orange-500 px-4 py-1.5 text-xs font-bold tracking-[0.2em] text-white uppercase">
            App coming soon
          </p>
        )}
        <RevealHeading
          className="mx-auto mt-6 max-w-3xl text-balance text-[clamp(2rem,5vw,3.8rem)] leading-[1.03]"
          text="Tell us what you need."
          accent="We'll bring verified pros by tomorrow."
        />
        {LAUNCHED ? null : (
          <p className="mx-auto mt-6 max-w-xl text-lg text-navy-600">
            The Abhiyantri Setu app for Android and iPhone is coming soon to Greater Noida. Get
            early access and we will message you on WhatsApp the day it launches.
          </p>
        )}
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/post"
            className="rounded-full bg-navy-700 px-8 py-4 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-navy-800"
          >
            {LAUNCHED ? 'Post a requirement, free' : 'Get a quote'}
          </Link>
          <Link
            href="/services"
            className="rounded-full border-2 border-navy-700/20 px-8 py-4 font-bold transition hover:bg-white/30"
          >
            Browse services
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
