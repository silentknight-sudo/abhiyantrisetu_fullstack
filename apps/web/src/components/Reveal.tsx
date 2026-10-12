'use client';

import { motion, type HTMLMotionProps } from 'motion/react';

/**
 * Swings children up into place in 3D (a slight forward tilt that settles flat) the first
 * time they scroll into view.
 */
export function Reveal({
  delay = 0,
  y = 40,
  className,
  children,
  ...rest
}: { delay?: number; y?: number } & HTMLMotionProps<'div'>) {
  return (
    <motion.div
      initial={{ opacity: 0, y, rotateX: 18, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformPerspective: 1000, transformOrigin: '50% 100%' }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Letter-spaced eyebrow above a section heading. */
export function SectionLabel({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p
      className={`mb-4 text-sm font-semibold tracking-[0.28em] uppercase ${dark ? 'text-orange-300' : 'text-orange-600'}`}
    >
      {children}
    </p>
  );
}
