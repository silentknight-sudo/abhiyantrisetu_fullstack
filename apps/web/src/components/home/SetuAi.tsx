'use client';

import { t as strings } from '@setu/domain';
import { Camera, Mic, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { RevealHeading } from '../RevealHeading';
import { Tilt } from '../Tilt';
import { Reveal, SectionLabel } from '../Reveal';

const CHAT = [
  { from: 'user', text: 'Mere 2BHK ka bathroom renovate karwana hai, kitna kharcha aayega?' },
  {
    from: 'ai',
    text: 'For a 40 sqft bathroom in Greater Noida with mid-range tiles and fittings, expect roughly ₹1.1–1.6 lakh. Want me to draft a requirement and get 3 quotes?',
  },
  { from: 'user', text: 'Haan, aur site visit bhi chahiye' },
  {
    from: 'ai',
    text: 'Done. Draft ready: Bathroom renovation · Sector Pi · free site visit. Tap confirm to post.',
  },
];

export function SetuAi() {
  return (
    <section id="ai" className="relative overflow-hidden bg-background py-28">
      <div
        aria-hidden
        className="absolute top-20 -right-40 h-[500px] w-[500px] rounded-full bg-orange-200/40 blur-3xl"
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <SectionLabel>Setu AI</SectionLabel>
          <Reveal>
            <RevealHeading
              className="text-balance text-[clamp(2.4rem,5vw,4rem)] leading-[1.02] text-navy-700"
              text="Ask in Hinglish."
              accent="Get a plan."
            />
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-text-muted">
              Setu AI understands how you actually talk. It estimates costs from real Greater Noida
              rate cards, diagnoses problems from a photo, and turns your answers into a requirement
              pros can quote on.
            </p>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Sparkles, title: 'Chat', body: 'Costs, scope and the right service' },
              { icon: Camera, title: 'Photo diagnosis', body: 'Seepage, cracks, wiring faults' },
              { icon: Mic, title: 'Voice', body: 'Speak in Hindi, get replies aloud' },
            ].map(({ icon: Icon, title, body }, i) => (
              <Reveal
                key={title}
                delay={0.15 + i * 0.08}
                className="rounded-2xl border border-border bg-surface p-4"
              >
                <Icon size={20} className="text-orange-500" />
                <p className="mt-3 font-bold text-navy-600">{title}</p>
                <p className="mt-1 text-sm text-text-muted">{body}</p>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-xs text-text-muted">
            {strings('en').indicativeEstimate} Setu AI never books or confirms a price without your
            tap.
          </p>
        </div>

        <div className="relative">
          <Tilt
            max={7}
            className="rounded-[32px] border border-border bg-surface p-5 shadow-[0_30px_80px_-30px_rgba(26,58,82,0.35)]"
          >
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white">
                <Sparkles size={18} />
              </span>
              <div>
                <p className="font-bold text-navy-600">Setu AI</p>
                <p className="text-xs text-success">Online · English, हिंदी, Hinglish</p>
              </div>
            </div>
            <div className="space-y-3 py-5">
              {CHAT.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 14, scale: 0.96 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: '-15%' }}
                  transition={{ delay: 0.3 + i * 0.6, duration: 0.45 }}
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.from === 'user'
                      ? 'ml-auto rounded-br-md bg-navy-600 text-white'
                      : 'rounded-bl-md bg-surface-muted text-text'
                  }`}
                >
                  {m.text}
                </motion.div>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border px-4 py-2">
              <span className="flex-1 text-sm text-text-muted">Type or hold to speak…</span>
              <span className="flex h-8 items-end gap-[3px]" aria-hidden>
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.span
                    key={i}
                    className="w-[3px] rounded-full bg-orange-400"
                    animate={{ height: [6, 22, 10, 18, 6] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.12 }}
                  />
                ))}
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-orange-400 text-navy-800">
                <Mic size={16} />
              </span>
            </div>
          </Tilt>
        </div>
      </div>
    </section>
  );
}
