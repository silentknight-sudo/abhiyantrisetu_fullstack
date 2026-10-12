'use client';

import { ArrowRight, BadgeCheck, Clock3, ShieldCheck, Sparkles } from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';
import { FLOWS } from '@/lib/content';

/** Deterministic skyline so server and client render identical SVG. */
function skyline(seed: number, count: number, minH: number, maxH: number) {
  let s = seed;
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const out: { x: number; w: number; h: number; windows: boolean }[] = [];
  let x = 0;
  for (let i = 0; i < count; i++) {
    const w = 40 + rand() * 70;
    out.push({ x, w, h: minH + rand() * (maxH - minH), windows: rand() > 0.35 });
    x += w + 4 + rand() * 10;
  }
  return { buildings: out, width: x };
}

const BACK = skyline(7, 34, 120, 330);
const FRONT = skyline(19, 26, 60, 200);

function Skyline({
  data,
  fill,
  windowFill,
}: {
  data: ReturnType<typeof skyline>;
  fill: string;
  windowFill: string;
}) {
  const H = 340;
  return (
    <svg
      viewBox={`0 0 ${data.width} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      className="h-full w-full"
      aria-hidden
    >
      {data.buildings.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={H - b.h} width={b.w} height={b.h} fill={fill} />
          {b.windows &&
            Array.from({ length: Math.floor((b.h - 20) / 22) }).map((_, r) =>
              Array.from({ length: Math.floor((b.w - 10) / 14) }).map((__, c) =>
                (r * 7 + c * 3 + i) % 5 === 0 ? (
                  <rect
                    key={`${r}-${c}`}
                    x={b.x + 8 + c * 14}
                    y={H - b.h + 12 + r * 22}
                    width={6}
                    height={9}
                    fill={windowFill}
                  />
                ) : null,
              ),
            )}
        </g>
      ))}
    </svg>
  );
}

const WORDS = ['Build,', 'repair', 'and', 'renovate', 'with', 'pros', 'you', 'can', 'trust.'];

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const backY = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const frontY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const logoScale = useTransform(scrollYProgress, [0, 1], [1, 1.35]);
  const logoRotate = useTransform(scrollYProgress, [0, 1], [0, -6]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.6], [0.9, 0.2]);

  return (
    <section
      ref={ref}
      className="relative isolate min-h-[100svh] overflow-hidden bg-navy-800 pt-[72px] text-white"
    >
      <motion.div
        aria-hidden
        style={{ opacity: glowOpacity }}
        className="absolute -top-40 left-1/2 -z-10 h-[680px] w-[980px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,159,67,0.35),rgba(26,58,82,0)_70%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,#0A1823_0%,#102434_45%,#1A3A52_100%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />

      {/* Parallax skyline */}
      <motion.div
        style={{ y: backY }}
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-[46vh] opacity-60"
      >
        <Skyline data={BACK} fill="#1A3A52" windowFill="#4E7898" />
      </motion.div>
      <motion.div
        style={{ y: frontY }}
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-[30vh]"
      >
        <Skyline data={FRONT} fill="#0A1823" windowFill="#FF9F43" />
      </motion.div>

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-14 pb-40 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:pt-24"
      >
        <div>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-navy-100 backdrop-blur"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-400" />
            </span>
            Now live across Greater Noida
          </motion.p>

          <h1 className="text-balance text-[clamp(2.4rem,6vw,4.6rem)] leading-[1.02] font-extrabold tracking-[-0.03em]">
            {WORDS.map((w, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: '0.6em', filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.7, delay: 0.15 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                className={`mr-[0.25em] inline-block ${w === 'trust.' ? 'text-orange-400' : ''}`}
              >
                {w}
              </motion.span>
            ))}
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.85 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-navy-100"
          >
            One app for home services, construction, materials and equipment. Get 2+ quotes from
            verified pros in 24 hours, and pay only when each milestone is done.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Link
              href="/post"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-orange-400 px-7 py-4 text-base font-bold text-navy-800 shadow-[0_12px_40px_-10px_rgba(255,159,67,0.8)] transition hover:-translate-y-0.5 hover:bg-orange-300"
            >
              Post a requirement
              <ArrowRight size={18} className="transition group-hover:translate-x-1" />
            </Link>
            <Link
              href="#how"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-7 py-4 text-base font-semibold text-white transition hover:bg-white/10"
            >
              See how it works
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="mt-8 flex flex-wrap gap-2"
          >
            {FLOWS.map((f) => (
              <Link
                key={f.id}
                href={`/post?type=${f.type}`}
                className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-sm text-navy-100 transition hover:border-orange-400/60 hover:text-white"
              >
                {f.title}
              </Link>
            ))}
          </motion.div>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[460px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 rounded-full border border-white/10 bg-white/[0.03]"
          />
          <motion.div
            aria-hidden
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-6 rounded-full border border-dashed border-orange-400/30"
          />
          <motion.div
            style={{ scale: logoScale, rotate: logoRotate }}
            className="absolute inset-0 grid place-items-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <Image
                src="/logo-on-dark.png"
                alt="Abhiyantri Setu"
                width={334}
                height={190}
                priority
                className="w-[78%] min-w-[240px] drop-shadow-[0_20px_40px_rgba(255,159,67,0.25)]"
              />
            </motion.div>
          </motion.div>

          {[
            { icon: BadgeCheck, text: 'KYC + police verified', cls: 'left-0 top-[14%]', d: 1.1 },
            { icon: Clock3, text: '2+ quotes in 24 hrs', cls: 'right-0 top-[38%]', d: 1.3 },
            {
              icon: ShieldCheck,
              text: 'Setu Safe payments',
              cls: 'left-[6%] bottom-[16%]',
              d: 1.5,
            },
            { icon: Sparkles, text: 'Setu AI in Hindi', cls: 'right-[4%] bottom-[4%]', d: 1.7 },
          ].map(({ icon: Icon, text, cls, d }, i) => (
            <motion.div
              key={text}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
              transition={{
                opacity: { delay: d, duration: 0.5 },
                scale: { delay: d, duration: 0.5 },
                y: { delay: d, duration: 4 + i, repeat: Infinity, ease: 'easeInOut' },
              }}
              className={`absolute ${cls} flex items-center gap-2 rounded-2xl border border-white/10 bg-navy-700/80 px-3.5 py-2.5 text-sm font-medium shadow-xl backdrop-blur-md`}
            >
              <Icon size={16} className="text-orange-400" />
              {text}
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs tracking-[0.2em] text-navy-200 uppercase md:flex"
      >
        Scroll
        <span className="relative h-10 w-6 rounded-full border border-white/25">
          <motion.span
            animate={{ y: [6, 20, 6] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            className="absolute left-1/2 h-2 w-1 -translate-x-1/2 rounded-full bg-orange-400"
          />
        </span>
      </motion.div>
    </section>
  );
}
