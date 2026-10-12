'use client';

import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
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

  // Home has a dark hero; other pages start on a light surface.
  const overDark = pathname === '/' && !scrolled;

  return (
    <motion.header
      animate={{ y: hidden ? -96 : 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled || pathname !== '/'
          ? 'border-b border-border/70 bg-surface/85 backdrop-blur-xl'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo onDark={overDark} />
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                overDark
                  ? 'text-navy-100 hover:bg-white/10 hover:text-white'
                  : 'text-text-muted hover:bg-surface-muted hover:text-text'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/post"
            className="hidden rounded-full bg-orange-400 px-5 py-2.5 text-sm font-bold text-navy-800 shadow-[0_8px_24px_-8px_rgba(255,159,67,0.7)] transition hover:-translate-y-0.5 hover:bg-orange-300 sm:inline-flex"
          >
            Post a requirement
          </Link>
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className={`grid h-11 w-11 place-items-center rounded-full lg:hidden ${overDark ? 'text-white' : 'text-text'}`}
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
            className="overflow-hidden border-t border-border bg-surface lg:hidden"
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
                className="mt-2 rounded-full bg-orange-400 px-5 py-3 text-center font-bold text-navy-800"
              >
                Post a requirement
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
