'use client';

import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { PRIMARY_CTA } from '@/lib/launch';
import { Logo } from './Logo';

const NAV = [
  { href: '/#services', label: 'Services' },
  { href: '/#how', label: 'How it works' },
  { href: '/#build', label: 'Build a house' },
  { href: '/#ai', label: 'Setu AI' },
  { href: '/#calculator', label: 'Cost calculator' },
  { href: '/#partners', label: 'For partners' },
];

export function Header() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 40);
    setHidden(y > 400 && y > prev && !open);
  });

  const solid = scrolled || pathname !== '/';

  return (
    <motion.header
      animate={{ y: hidden ? -96 : 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        solid ? 'border-b border-border/70 bg-background/85 backdrop-blur-xl' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-full px-3 py-2 text-[15px] text-navy-700 transition-colors hover:text-orange-600"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/#ai"
            className="hidden items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-400 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(242,134,31,0.8)] transition hover:-translate-y-0.5 md:inline-flex"
          >
            ✦ Setu AI
          </Link>
          <Link
            href="/post"
            className="hidden rounded-full bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(16,36,52,0.6)] transition hover:-translate-y-0.5 hover:bg-navy-800 sm:inline-flex"
          >
            {PRIMARY_CTA}
          </Link>
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="grid h-11 w-11 place-items-center rounded-full text-navy-700 lg:hidden"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-border bg-background lg:hidden"
          >
            <div className="flex flex-col px-4 py-3">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 font-medium text-text hover:bg-surface-muted"
                >
                  {n.label}
                </Link>
              ))}
              <Link
                href="/post"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-full bg-navy-700 px-5 py-3 text-center font-semibold text-white"
              >
                {PRIMARY_CTA}
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
