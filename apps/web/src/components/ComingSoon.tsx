'use client';

import { useLenis } from 'lenis/react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { track } from '@/lib/analytics';
import { LAUNCHED } from '@/lib/launch';
import { WaitlistForm } from './WaitlistForm';

/**
 * Before launch, intercepts every link to /post and every element marked
 * `data-coming-soon="Feature name"`, and shows a "Coming soon" dialog instead.
 */
export function ComingSoonProvider() {
  const [feature, setFeature] = useState<string | null>(null);
  const lenis = useLenis();

  useEffect(() => {
    if (LAUNCHED) return;
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('a, button');
      if (!el) return;
      const marked = el.dataset.comingSoon;
      const href = el instanceof HTMLAnchorElement ? (el.getAttribute('href') ?? '') : '';
      const isPost = href === '/post' || href.startsWith('/post?');
      if (!marked && !isPost) return;
      e.preventDefault();
      const name = marked ?? 'Posting a requirement';
      track('coming_soon_opened', { feature: name });
      setFeature(name);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    if (feature) lenis?.stop();
    else lenis?.start();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFeature(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [feature, lenis]);

  return (
    <AnimatePresence>
      {feature && (
        <motion.div
          key="coming-soon"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] grid place-items-center bg-navy-900/45 px-4 backdrop-blur-sm"
          onClick={() => setFeature(null)}
          data-lenis-prevent
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="coming-soon-title"
            initial={{ opacity: 0, y: 30, rotateX: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformPerspective: 1000 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[32px] border border-border bg-surface p-6 text-center shadow-[0_40px_80px_-30px_rgba(10,24,35,0.6)] sm:p-8"
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setFeature(null)}
              className="absolute top-4 right-4 grid h-10 w-10 place-items-center rounded-full text-navy-700 hover:bg-surface-muted"
            >
              <X size={18} />
            </button>
            <Image src="/logo.png" alt="" width={334} height={185} className="mx-auto w-24" />
            <p className="mt-5 text-xs font-semibold tracking-[0.3em] text-orange-600 uppercase">
              Coming soon
            </p>
            <h2 id="coming-soon-title" className="mt-2 text-4xl leading-tight text-navy-700">
              {feature} <em>is almost here.</em>
            </h2>
            <p className="mt-3 leading-relaxed text-text-muted">
              Abhiyantri Setu launches in Greater Noida soon, on the web and as Android and iPhone
              apps. Join the early-access list and we&apos;ll message you the day it goes live.
            </p>
            <div className="mt-6">
              <WaitlistForm
                source={`dialog:${feature}`}
                defaultRole={
                  /partner/i.test(feature)
                    ? 'provider'
                    : /supplier|rental/i.test(feature)
                      ? 'supplier'
                      : 'customer'
                }
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Small "Coming soon" pill. */
export function SoonBadge({ dark }: { dark?: boolean }) {
  if (LAUNCHED) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 align-middle text-[11px] font-semibold tracking-wider uppercase ${
        dark ? 'bg-orange-400/20 text-orange-300' : 'bg-orange-100 text-orange-600'
      }`}
    >
      Coming soon
    </span>
  );
}
