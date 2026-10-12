'use client';

import { motion, type HTMLMotionProps } from 'motion/react';

/** Fades and lifts children into place the first time they scroll into view. */
export function Reveal({
  delay = 0,
  y = 28,
  className,
  children,
  ...rest
}: { delay?: number; y?: number } & HTMLMotionProps<'div'>) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function SectionLabel({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p
      className={`mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase ${
        dark ? 'bg-white/10 text-orange-300' : 'bg-orange-50 text-orange-600'
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
      {children}
    </p>
  );
}
