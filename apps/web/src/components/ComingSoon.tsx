'use client';

import { useLenis } from 'lenis/react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { SITE } from '@/lib/content';
import { LAUNCHED } from '@/lib/launch';

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
      setFeature(marked ?? 'Posting a requirement');
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
            className="relative w-full max-w-md rounded-[32px] border border-border bg-surface p-8 text-center shadow-[0_40px_80px_-30px_rgba(10,24,35,0.6)]"
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setFeature(null)}
              className="absolute top-4 right-4 grid h-10 w-10 place-items-center rounded-full text-navy-700 hover:bg-surface-muted"
            >
              <X size={18} />
            </button>
            <Image src="/logo.png" alt="" width={334} height={190} className="mx-auto w-24" />
            <p className="mt-5 text-xs font-semibold tracking-[0.3em] text-orange-600 uppercase">
              Coming soon
            </p>
            <h2 id="coming-soon-title" className="mt-2 text-4xl leading-tight text-navy-700">
              {feature} <em>is almost here.</em>
            </h2>
            <p className="mt-4 leading-relaxed text-text-muted">
              Abhiyantri Setu is launching in Greater Noida soon, on the web and as apps for Android
              and iPhone. Message us on WhatsApp and we&apos;ll tell you the day it goes live.
            </p>
            <div className="mt-7 flex flex-col gap-3">
              <a
                href={`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(
                  `Hi Abhiyantri Setu, please notify me when ${feature.toLowerCase()} is live.`,
                )}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-navy-700 px-6 py-3.5 font-semibold text-white transition hover:bg-navy-800"
              >
                Notify me on WhatsApp
              </a>
              <p className="text-sm text-text-muted">
                Or write to{' '}
                <span className="font-medium text-navy-700 select-all">{SITE.email}</span>
              </p>
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
