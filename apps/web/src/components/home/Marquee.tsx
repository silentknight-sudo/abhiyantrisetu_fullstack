'use client';

import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react';
import { useRef } from 'react';
import { SECTORS } from '@/lib/content';

const BASE_SPEED = 3; // % of the track per second

/** Wraps v into [min, max). */
const wrap = (min: number, max: number, v: number) => {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
};

/**
 * Sector names drift sideways and react to the visitor's scroll: faster scrolling speeds
 * them up and leans the text; scrolling up reverses the direction.
 */
export function Marquee() {
  const reduce = useReducedMotion();
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const boost = useTransform(velocity, [-2000, 0, 2000], [-5, 0, 5], { clamp: false });
  const skewX = useTransform(velocity, [-2500, 0, 2500], [8, 0, -8]);
  const direction = useRef(1);

  useAnimationFrame((_, delta) => {
    if (reduce) return;
    const b = boost.get();
    if (b < 0) direction.current = -1;
    else if (b > 0) direction.current = 1;
    const move = direction.current * BASE_SPEED * (delta / 1000) * (1 + Math.abs(b));
    baseX.set(wrap(-50, 0, baseX.get() - move));
  });
  const x = useTransform(baseX, (v) => `${v}%`);

  const items = [...SECTORS, ...SECTORS];
  return (
    <div
      className="relative overflow-hidden border-y border-border bg-surface py-5"
      aria-label="Sectors we serve"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-surface to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-surface to-transparent" />
      <motion.div style={{ x, skewX }} className="flex w-max gap-10 whitespace-nowrap">
        {items.map((s, i) => (
          <span
            key={i}
            className="flex items-center gap-10 font-display text-xl font-semibold text-navy-600"
            aria-hidden={i >= SECTORS.length}
          >
            {s.name}
            <span className="h-1.5 w-1.5 rotate-45 bg-orange-400" />
          </span>
        ))}
      </motion.div>
    </div>
  );
}
