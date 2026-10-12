'use client';

import { motion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useRef } from 'react';
import { SectionLabel } from '../Reveal';

const TEXT =
  'Every home in Greater Noida deserves verified pros, honest line-by-line quotes, and payments that wait for your approval. That is the bridge we are building.';
const HIGHLIGHT = new Set(['verified', 'honest', 'approval.', 'bridge']);

function Word({
  word,
  progress,
  range,
}: {
  word: string;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  const y = useTransform(progress, range, [8, 0]);
  const accent = HIGHLIGHT.has(word);
  return (
    <motion.span
      style={{ opacity, y }}
      className={`mr-[0.25em] inline-block ${accent ? 'italic text-orange-500' : ''}`}
    >
      {word}
    </motion.span>
  );
}

/** A statement whose words light up one by one as the visitor scrolls through it. */
export function Manifesto() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.45'] });
  const words = TEXT.split(' ');
  return (
    <section ref={ref} className="bg-background py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionLabel>Why Setu</SectionLabel>
        <p className="font-display text-[clamp(2rem,4.6vw,3.8rem)] leading-[1.15] font-medium text-navy-700">
          {words.map((w, i) => (
            <Word
              key={i}
              word={w}
              progress={scrollYProgress}
              range={[i / words.length, (i + 1) / words.length]}
            />
          ))}
        </p>
      </div>
    </section>
  );
}
