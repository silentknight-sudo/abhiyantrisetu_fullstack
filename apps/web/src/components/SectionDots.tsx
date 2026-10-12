'use client';

import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

const SECTIONS = [
  { id: 'services', label: 'Services' },
  { id: 'how', label: 'How it works' },
  { id: 'trust', label: 'Why trust Setu' },
  { id: 'build', label: 'Build a house' },
  { id: 'ai', label: 'Setu AI' },
  { id: 'calculator', label: 'Cost calculator' },
  { id: 'societies', label: 'Societies' },
  { id: 'partners', label: 'For partners' },
  { id: 'faq', label: 'FAQ' },
];

/** Dots on the right edge that light up the current section and jump between them. */
export function SectionDots() {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <motion.nav
      aria-label="Page sections"
      initial={{ opacity: 0 }}
      animate={{ opacity: active ? 1 : 0 }}
      className="fixed top-1/2 right-5 z-40 hidden -translate-y-1/2 flex-col gap-3 xl:flex"
    >
      {SECTIONS.map((s) => {
        const on = active === s.id;
        return (
          <a key={s.id} href={`#${s.id}`} className="group flex items-center justify-end gap-3">
            <span
              className={`rounded-full bg-surface/90 px-2.5 py-1 text-xs font-medium text-navy-700 shadow-sm backdrop-blur transition ${
                on ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
            >
              {s.label}
            </span>
            <motion.span
              animate={{ height: on ? 26 : 8, backgroundColor: on ? '#FF9F43' : '#ABC2D4' }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="block w-2 rounded-full"
            />
          </a>
        );
      })}
    </motion.nav>
  );
}
