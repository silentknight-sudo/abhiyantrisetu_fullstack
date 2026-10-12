'use client';

import { animate, useInView, useMotionValue, useTransform, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { Reveal } from '../Reveal';

function Counter({
  to,
  suffix = '',
  prefix = '',
}: {
  to: number;
  suffix?: string;
  prefix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });
  const value = useMotionValue(0);
  const text = useTransform(
    value,
    (v) => `${prefix}${Math.round(v).toLocaleString('en-IN')}${suffix}`,
  );
  useEffect(() => {
    if (inView) animate(value, to, { duration: 1.8, ease: [0.22, 1, 0.36, 1] });
  }, [inView, to, value]);
  return <motion.span ref={ref}>{text}</motion.span>;
}

/** Launch targets, phrased as commitments rather than claims. */
const STATS = [
  { to: 24, suffix: ' hrs', label: 'to your first 2 quotes' },
  { to: 100, suffix: '%', label: 'partners KYC verified' },
  { to: 12, suffix: '', label: 'sectors at launch' },
  { to: 48, suffix: ' hrs', label: 'to approve before payout' },
];

export function Stats() {
  return (
    <section className="bg-background py-20">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 sm:px-6 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08} className="border-l-2 border-orange-400 pl-5">
            <p className="text-[clamp(2.2rem,5vw,3.6rem)] leading-none font-display font-semibold text-navy-700">
              <Counter to={s.to} suffix={s.suffix} />
            </p>
            <p className="mt-2 text-sm text-text-muted">{s.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
