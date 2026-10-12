'use client';

import { formatINR, rupeesToPaise } from '@setu/domain';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useState } from 'react';
import { BUILD_RATES } from '@/lib/content';
import { RevealHeading } from '../RevealHeading';
import { Reveal, SectionLabel } from '../Reveal';

type Tab = 'build' | 'paint';
type Tier = keyof typeof BUILD_RATES;

const PAINT_RATES: Record<Tier, number> = { basic: 14, standard: 20, premium: 30 }; // ₹/sqft of wall

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex justify-between text-sm font-semibold text-navy-600">
        {label}
        <span className="text-orange-600">
          {value.toLocaleString('en-IN')} {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full accent-orange-500"
      />
    </label>
  );
}

export function Calculator() {
  const [tab, setTab] = useState<Tab>('build');
  const [area, setArea] = useState(1200);
  const [floors, setFloors] = useState(2);
  const [carpet, setCarpet] = useState(1100);
  const [tier, setTier] = useState<Tier>('standard');

  const base =
    tab === 'build'
      ? rupeesToPaise(area * floors * BUILD_RATES[tier].perSqft)
      : rupeesToPaise(Math.round(carpet * 3.2) * PAINT_RATES[tier]); // wall area ≈ 3.2 × carpet area
  const low = Math.round(base * 0.9);
  const high = Math.round(base * 1.1);
  const split =
    tab === 'build'
      ? [
          ['Materials', 0.58],
          ['Labour', 0.3],
          ['Design, approvals & supervision', 0.12],
        ]
      : [
          ['Paint & primer', 0.55],
          ['Labour', 0.38],
          ['Putty & prep', 0.07],
        ];

  return (
    <section id="calculator" className="bg-surface py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-start gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionLabel>Cost calculator</SectionLabel>
            <Reveal>
              <RevealHeading
                className="text-balance text-[clamp(2.4rem,5vw,4rem)] leading-[1.02] text-navy-700"
                text="Know the ballpark"
                accent="before you call anyone."
              />
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-5 text-lg text-text-muted">
                Based on current Greater Noida rates. Your final quote comes line by line, with GST,
                after a free site visit.
              </p>
            </Reveal>
          </div>

          <Reveal
            delay={0.1}
            className="rounded-[32px] border border-border bg-background p-6 sm:p-8"
          >
            <div role="tablist" className="inline-flex rounded-full bg-surface-muted p-1">
              {(
                [
                  ['build', 'House construction'],
                  ['paint', 'Painting'],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  role="tab"
                  aria-selected={tab === k}
                  onClick={() => setTab(k)}
                  className={`relative rounded-full px-4 py-2 text-sm font-semibold ${tab === k ? 'text-white' : 'text-text-muted'}`}
                >
                  {tab === k && (
                    <motion.span
                      layoutId="calc-tab"
                      className="absolute inset-0 rounded-full bg-navy-600"
                    />
                  )}
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>

            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <div className="space-y-7">
                {tab === 'build' ? (
                  <>
                    <Slider
                      label="Built-up area per floor"
                      value={area}
                      min={400}
                      max={5000}
                      step={50}
                      unit="sqft"
                      onChange={setArea}
                    />
                    <Slider
                      label="Floors"
                      value={floors}
                      min={1}
                      max={5}
                      step={1}
                      unit={floors === 1 ? 'floor' : 'floors'}
                      onChange={setFloors}
                    />
                  </>
                ) : (
                  <Slider
                    label="Carpet area"
                    value={carpet}
                    min={300}
                    max={4000}
                    step={50}
                    unit="sqft"
                    onChange={setCarpet}
                  />
                )}
                <div>
                  <p className="text-sm font-semibold text-navy-600">Finish quality</p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(Object.keys(BUILD_RATES) as Tier[]).map((k) => (
                      <button
                        key={k}
                        onClick={() => setTier(k)}
                        className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                          tier === k
                            ? 'border-orange-400 bg-orange-50 text-orange-600'
                            : 'border-border text-text-muted hover:border-navy-300'
                        }`}
                      >
                        {BUILD_RATES[k].label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-navy-600 p-6 text-white">
                <p className="text-xs tracking-wider text-navy-200 uppercase">
                  Indicative estimate
                </p>
                <AnimatePresence mode="popLayout">
                  <motion.p
                    key={`${low}-${high}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-2 text-[clamp(1.5rem,3vw,2.1rem)] leading-tight font-display font-semibold"
                  >
                    {formatINR(low, { decimals: false })} – {formatINR(high, { decimals: false })}
                  </motion.p>
                </AnimatePresence>
                <div className="mt-6 space-y-3">
                  {split.map(([label, share]) => (
                    <div key={label as string}>
                      <div className="flex justify-between text-sm">
                        <span className="text-navy-100">{label}</span>
                        <span>
                          {formatINR(Math.round(base * (share as number)), { decimals: false })}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          animate={{ width: `${(share as number) * 100}%` }}
                          className="h-full bg-orange-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-[11px] text-navy-200">
                  Excludes GST (18% on labour where applicable), land and approvals fees.
                </p>
                <Link
                  href={`/post?type=${tab === 'build' ? 'renovation' : 'service'}`}
                  className="mt-5 block rounded-full bg-orange-400 py-3 text-center text-sm font-bold text-navy-800 transition hover:bg-orange-300"
                >
                  Get exact quotes
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
