'use client';

import { ReactLenis } from 'lenis/react';
import { useEffect, useState } from 'react';

/** Inertial smooth scrolling; switched off for users who prefer reduced motion. */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setEnabled(!mq.matches);
    const onChange = () => setEnabled(!mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  if (!enabled) return <>{children}</>;
  return (
    <ReactLenis root options={{ lerp: 0.09, anchors: { offset: -72 }, autoRaf: true }}>
      {children}
    </ReactLenis>
  );
}
