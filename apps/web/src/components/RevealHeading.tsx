'use client';

import { motion } from 'motion/react';

/**
 * A section heading whose words flip up into place in 3D, one after another, when it
 * scrolls into view. `accent` is set in orange.
 */
export function RevealHeading({
  text,
  accent,
  className,
  as = 'h2',
}: {
  text: string;
  accent?: string;
  className?: string;
  as?: 'h1' | 'h2';
}) {
  const words = [
    ...text
      .split(' ')
      .filter(Boolean)
      .map((w) => ({ w, em: false })),
    ...(accent ?? '')
      .split(' ')
      .filter(Boolean)
      .map((w) => ({ w, em: true })),
  ];
  const Tag = as === 'h1' ? motion.h1 : motion.h2;
  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ staggerChildren: 0.06 }}
      aria-label={[text, accent].filter(Boolean).join(' ')}
    >
      {words.map(({ w, em }, i) => (
        <span
          key={i}
          aria-hidden
          className="inline-block overflow-hidden pb-[0.12em] align-bottom [perspective:600px]"
        >
          <motion.span
            className="inline-block origin-bottom"
            variants={{
              hidden: { rotateX: -90, y: '0.4em', opacity: 0 },
              shown: {
                rotateX: 0,
                y: 0,
                opacity: 1,
                transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
              },
            }}
          >
            {em ? <em>{w}</em> : w}
          </motion.span>
          {i < words.length - 1 && ' '}
        </span>
      ))}
    </Tag>
  );
}
