'use client';

import { useInView } from 'motion/react';
import dynamic from 'next/dynamic';
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';

/** Three.js only runs in the browser; load the scenes lazily so they never block first paint. */
export const HeroScene = dynamic(() => import('./HeroScene'), { ssr: false });
export const HouseScene = dynamic(() => import('./HouseScene'), { ssr: false });
export const GlassHouseScene = dynamic(() => import('./GlassHouseScene'), { ssr: false });

/** Shows `fallback` if WebGL is unavailable or the scene throws. */
class SceneBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Hosts a 3D scene: renders frames only while it is near the viewport, and falls back to a
 * static picture on devices without WebGL.
 */
export function SceneSlot({
  className,
  fallback,
  children,
}: {
  className?: string;
  fallback: ReactNode;
  children: (active: boolean) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const active = useInView(ref, { margin: '200px 0px 200px 0px' });
  // Checked after mount so server and client render the same markup.
  const [webgl, setWebgl] = useState<boolean | null>(null);
  useEffect(() => setWebgl(webglAvailable()), []);
  return (
    <div ref={ref} className={className}>
      {webgl === false
        ? fallback
        : webgl && <SceneBoundary fallback={fallback}>{children(active)}</SceneBoundary>}
    </div>
  );
}
