'use client';

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type HTMLMotionProps,
} from 'motion/react';

/** Tilts toward the pointer in 3D. Touch devices simply see a flat card. */
export function Tilt({
  children,
  max = 10,
  className,
  style,
  ...rest
}: { max?: number } & HTMLMotionProps<'div'>) {
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-max, max]), {
    stiffness: 200,
    damping: 20,
  });
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [max, -max]), {
    stiffness: 200,
    damping: 20,
  });
  return (
    <motion.div
      className={className}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 900,
        transformStyle: 'preserve-3d',
        ...style,
      }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width - 0.5);
        py.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
