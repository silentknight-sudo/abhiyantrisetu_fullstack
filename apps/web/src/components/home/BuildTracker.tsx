'use client';

import { formatINR } from '@setu/domain';
import { Camera, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react';
import { useRef, useState } from 'react';
import { CONSTRUCTION_STAGES } from '@/lib/content';
import { SectionLabel } from '../Reveal';
import { RevealHeading } from '../RevealHeading';
import { HouseScene, SceneSlot } from '../three/Scenes';

const TOTAL = 48_00_000_00; // ₹48 lakh sample project, in paise

/** Flat drawing of the house, used where WebGL is unavailable. */
function House({ stage }: { stage: number }) {
  const show = (n: number) => ({ opacity: stage >= n ? 1 : 0, y: stage >= n ? 0 : 16 });
  const t = { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const };
  return (
    <svg viewBox="0 0 400 360" className="h-full w-full" aria-hidden>
      {/* ground */}
      <rect x="0" y="300" width="400" height="60" fill="#7C3F06" opacity="0.25" />
      <line x1="0" y1="300" x2="400" y2="300" stroke="#A65408" strokeWidth="2" />
      {/* 1: survey pegs */}
      <motion.g animate={show(0)} transition={t}>
        {[70, 330].map((x) => (
          <g key={x}>
            <line x1={x} y1="300" x2={x} y2="282" stroke="#FF9F43" strokeWidth="3" />
            <circle cx={x} cy="280" r="4" fill="#FF9F43" />
          </g>
        ))}
        <line x1="70" y1="290" x2="330" y2="290" stroke="#FF9F43" strokeDasharray="4 4" />
      </motion.g>
      {/* 2: excavation */}
      <motion.rect
        animate={show(1)}
        transition={t}
        x="60"
        y="300"
        width="280"
        height="36"
        fill="#522A04"
        opacity="0.6"
      />
      {/* 3: foundation */}
      <motion.g animate={show(2)} transition={t}>
        {[70, 150, 230, 310].map((x) => (
          <rect key={x} x={x} y="306" width="22" height="28" fill="#9AA2AD" />
        ))}
      </motion.g>
      {/* 4: plinth */}
      <motion.rect
        animate={show(3)}
        transition={t}
        x="60"
        y="286"
        width="280"
        height="16"
        fill="#717A86"
      />
      {/* 5: columns & beams */}
      <motion.g animate={show(4)} transition={t}>
        {[66, 146, 226, 312].map((x) => (
          <rect key={x} x={x} y="140" width="16" height="146" fill="#C1C7CF" />
        ))}
        <rect x="60" y="208" width="280" height="12" fill="#C1C7CF" />
      </motion.g>
      {/* 6: slabs */}
      <motion.g animate={show(5)} transition={t}>
        <rect x="50" y="200" width="300" height="12" fill="#535B66" />
        <rect x="50" y="130" width="300" height="12" fill="#535B66" />
      </motion.g>
      {/* 7: brickwork */}
      <motion.g animate={show(6)} transition={t}>
        <rect x="82" y="142" width="64" height="58" fill="#D06B0B" />
        <rect x="162" y="142" width="64" height="58" fill="#D06B0B" />
        <rect x="242" y="142" width="70" height="58" fill="#D06B0B" />
        <rect x="82" y="220" width="64" height="66" fill="#D06B0B" />
        <rect x="162" y="220" width="64" height="66" fill="#D06B0B" />
        <rect x="242" y="220" width="70" height="66" fill="#D06B0B" />
      </motion.g>
      {/* 8: plumbing & electrical */}
      <motion.g animate={show(7)} transition={t}>
        <path d="M100 286 V150 H130" stroke="#2F6FDE" strokeWidth="3" fill="none" />
        <path
          d="M290 286 V230 H260 V160"
          stroke="#E6A100"
          strokeWidth="3"
          fill="none"
          strokeDasharray="5 3"
        />
      </motion.g>
      {/* 9: plaster */}
      <motion.g animate={show(8)} transition={t}>
        <rect x="60" y="142" width="280" height="58" fill="#EEF0F3" />
        <rect x="60" y="212" width="280" height="74" fill="#EEF0F3" />
      </motion.g>
      {/* 10: finishing */}
      <motion.g animate={show(9)} transition={t}>
        <path d="M40 132 L200 70 L360 132 Z" fill="#1A3A52" />
        {[90, 175, 260].map((x) => (
          <rect key={`u${x}`} x={x} y="155" width="40" height="32" rx="3" fill="#FFB870" />
        ))}
        {[90, 260].map((x) => (
          <rect key={`d${x}`} x={x} y="230" width="40" height="32" rx="3" fill="#FFB870" />
        ))}
        <rect x="178" y="236" width="40" height="50" rx="3" fill="#FF9F43" />
      </motion.g>
    </svg>
  );
}

export function BuildTracker() {
  const ref = useRef<HTMLElement>(null);
  const [stage, setStage] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const fill = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);
  useMotionValueEvent(scrollYProgress, 'change', (p) =>
    setStage(Math.min(9, Math.floor(p * 10.5))),
  );
  const released = Math.round((TOTAL * (stage + 1)) / 10);

  return (
    <section id="build" ref={ref} className="relative h-[420vh] bg-surface-muted text-navy-700">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionLabel>House construction tracker</SectionLabel>
            <RevealHeading
              className="text-balance text-[clamp(2.2rem,4.5vw,3.6rem)] leading-[1.02]"
              text="Watch your house rise,"
              accent="stage by stage."
            />
            <p className="mt-4 max-w-md text-text-muted">
              Ten stages, each with an engineer inspection, photo visit report and a stage payment
              you approve. Nothing is paid for work you haven't seen.
            </p>
            <ol className="mt-8 hidden grid-cols-2 gap-x-6 gap-y-2.5 text-sm lg:grid">
              {CONSTRUCTION_STAGES.map((s, i) => (
                <li
                  key={s}
                  className={`flex items-center gap-2 transition-colors duration-300 ${i <= stage ? 'text-navy-700' : 'text-sand-500'}`}
                >
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold transition-colors duration-300 ${
                      i < stage
                        ? 'bg-success text-white'
                        : i === stage
                          ? 'bg-orange-400 text-white'
                          : 'bg-sand-300 text-navy-700'
                    }`}
                  >
                    {i < stage ? '✓' : i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </div>

          <div className="relative">
            <div className="relative aspect-[10/9] w-full overflow-hidden rounded-[32px] border border-border bg-gradient-to-b from-sand-50 to-sand-200">
              <SceneSlot
                className="absolute inset-0"
                fallback={
                  <div className="h-full p-6 pt-16 sm:pb-20">
                    <House stage={stage} />
                  </div>
                }
              >
                {(active) => (
                  <HouseScene stage={stage} progress={scrollYProgress} active={active} />
                )}
              </SceneSlot>
              <div className="absolute top-5 left-5 rounded-2xl bg-surface/90 px-4 py-3 shadow-sm backdrop-blur">
                <p className="text-[11px] tracking-wider text-text-muted uppercase">
                  Stage {stage + 1} of 10
                </p>
                <p className="text-lg font-bold">{CONSTRUCTION_STAGES[stage]}</p>
              </div>
              <div className="absolute right-5 bottom-5 left-5 hidden gap-3 sm:grid sm:grid-cols-3">
                <div className="flex items-center gap-2 rounded-2xl bg-surface/90 px-3 py-2.5 text-sm shadow-sm backdrop-blur">
                  <ClipboardCheck size={16} className="text-orange-400" /> Inspection passed
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-surface/90 px-3 py-2.5 text-sm shadow-sm backdrop-blur">
                  <Camera size={16} className="text-orange-400" /> {6 + stage * 3} site photos
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-surface/90 px-3 py-2.5 text-sm font-semibold text-success shadow-sm backdrop-blur">
                  <CheckCircle2 size={16} className="text-success" /> {formatINR(released)} released
                </div>
              </div>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-sand-300">
              <motion.div
                style={{ width: fill }}
                className="h-full bg-gradient-to-r from-orange-500 to-orange-300"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
