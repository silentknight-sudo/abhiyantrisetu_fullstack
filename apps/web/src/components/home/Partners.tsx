'use client';

import { formatINR } from '@setu/domain';
import { LAUNCHED } from '@/lib/launch';
import { SoonBadge } from '../ComingSoon';
import { BadgeCheck, IndianRupee, MessageCircle, Smartphone } from 'lucide-react';
import { motion, useMotionTemplate, useScroll, useTransform } from 'motion/react';
import Image from 'next/image';
import { useRef } from 'react';
import { RevealHeading } from '../RevealHeading';
import { Reveal, SectionLabel } from '../Reveal';

const WEEK = [42, 65, 38, 80, 72, 95, 60];

export function Partners() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const cardY = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const chatY = useTransform(scrollYProgress, [0, 1], [140, -40]);
  const logoRotate = useTransform(scrollYProgress, [0, 1], [-20, 20]);
  // Opens like a curtain: a rounded window that widens to full bleed as it scrolls in.
  const { scrollYProgress: enter } = useScroll({
    target: ref,
    offset: ['start end', 'start 0.15'],
  });
  const insetX = useTransform(enter, [0, 1], [7, 0]);
  const insetY = useTransform(enter, [0, 1], [9, 0]);
  const round = useTransform(enter, [0, 1], [56, 0]);
  const clipPath = useMotionTemplate`inset(${insetY}% ${insetX}% ${insetY}% ${insetX}% round ${round}px)`;

  return (
    <motion.section
      id="partners"
      ref={ref}
      style={{ clipPath }}
      className="relative overflow-hidden bg-navy-900 py-28 text-white"
    >
      <motion.div
        aria-hidden
        style={{ rotate: logoRotate }}
        className="absolute -right-32 -bottom-24 w-[640px] opacity-[0.05]"
      >
        <Image src="/logo-on-dark.png" alt="" width={334} height={190} className="w-full" />
      </motion.div>
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <SectionLabel dark>
            For plumbers, masons, contractors & suppliers <SoonBadge dark />
          </SectionLabel>
          <Reveal>
            <RevealHeading
              className="text-balance text-[clamp(2.4rem,5vw,4rem)] leading-[1.02]"
              text="More work."
              accent="Paid on time."
            />
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: MessageCircle,
                title: 'Leads on WhatsApp',
                body: 'Accept a job with one button, even without opening the app.',
              },
              {
                icon: IndianRupee,
                title: 'Weekly payouts',
                body: 'Straight to your bank. Track every rupee in the app.',
              },
              {
                icon: BadgeCheck,
                title: 'Verified badge',
                body: 'KYC once, then customers trust you from day one.',
              },
              {
                icon: Smartphone,
                title: 'Setu Partner app',
                body: 'Today’s jobs, quotes with GST, start codes, earnings.',
              },
            ].map(({ icon: Icon, title, body }, i) => (
              <Reveal
                key={title}
                delay={i * 0.07}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
              >
                <Icon size={20} className="text-orange-400" />
                <p className="mt-3 font-bold">{title}</p>
                <p className="mt-1 text-sm text-navy-200">{body}</p>
              </Reveal>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="https://wa.me/911200000000?text=Join%20Setu%20Partner"
              data-coming-soon={LAUNCHED ? undefined : 'Partner sign-up'}
              className="rounded-full bg-orange-400 px-6 py-3.5 font-bold text-navy-800 transition hover:bg-orange-300"
            >
              Join as a partner
            </a>
            <a
              href="mailto:partners@abhiyantrisetu.com?subject=Vendor%20portal"
              data-coming-soon={LAUNCHED ? undefined : 'The supplier & rental portal'}
              className="rounded-full border border-white/20 px-6 py-3.5 font-semibold transition hover:bg-white/10"
            >
              Supplier & rental portal
            </a>
          </div>
        </div>

        <div className="relative h-[520px]">
          <motion.div
            style={{ y: cardY }}
            className="absolute top-0 right-0 w-[min(100%,360px)] rounded-[28px] bg-surface p-6 text-text shadow-2xl"
          >
            <p className="text-xs tracking-wider text-text-muted uppercase">This week</p>
            <p className="mt-1 font-display text-4xl font-semibold text-navy-700">
              {formatINR(1_842_000, { decimals: false })}
            </p>
            <p className="text-sm text-success">
              Target {formatINR(2_500_000, { decimals: false })} · 74%
            </p>
            <div className="mt-6 flex h-32 items-end gap-2">
              {WEEK.map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex-1 rounded-t-lg ${i === 5 ? 'bg-orange-400' : 'bg-navy-200'}`}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-text-muted">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <span key={i} className="flex-1 text-center">
                  {d}
                </span>
              ))}
            </div>
          </motion.div>
          <motion.div
            style={{ y: chatY }}
            className="absolute bottom-0 left-0 w-[min(100%,330px)] rounded-[28px] bg-[#0B141A] p-4 shadow-2xl"
          >
            <p className="flex items-center gap-2 text-xs font-semibold text-[#25D366]">
              <MessageCircle size={14} /> WhatsApp · Setu Leads
            </p>
            <div className="mt-3 rounded-2xl rounded-tl-md bg-[#202C33] p-3 text-sm">
              <p className="font-semibold">New lead · Plumbing</p>
              <p className="mt-1 text-navy-200">
                Kitchen tap leaking · Sector Pi · 1.2 km · Today 4–6 pm
              </p>
              <p className="mt-1 text-navy-200">Customer budget ₹300–600</p>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-center text-sm font-semibold text-[#53BDEB]">
              <span className="rounded-xl bg-[#202C33] py-2">✅ Accept</span>
              <span className="rounded-xl bg-[#202C33] py-2">Not today</span>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
