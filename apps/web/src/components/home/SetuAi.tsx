'use client';

import { t as strings } from '@setu/domain';
import type { AssistantTurn } from '@setu/domain';
import { Camera, Mic, Send, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { askSetuAi } from '@/lib/api';
import { RevealHeading } from '../RevealHeading';
import { Tilt } from '../Tilt';
import { Reveal, SectionLabel } from '../Reveal';

const CHAT: AssistantTurn[] = [
  { role: 'user', content: 'Mere 2BHK ka bathroom renovate karwana hai, kitna kharcha aayega?' },
  {
    role: 'assistant',
    content:
      'For a 40 sqft bathroom in Greater Noida with mid-range tiles and fittings, expect roughly ₹1.1–1.6 lakh. Want me to draft a requirement and get 3 quotes?',
  },
  { role: 'user', content: 'Haan, aur site visit bhi chahiye' },
  {
    role: 'assistant',
    content:
      'Noted: bathroom renovation with a free site visit. Tap "Get a quote" and our team will confirm the visit on WhatsApp.',
  },
];

const SUGGESTIONS = [
  'Bathroom mein seelan aa rahi hai',
  'Cost to build a 1,200 sq ft house?',
  'किचन मॉड्यूलर बनवाना है',
];

export function SetuAi() {
  // Opens on a sample conversation; the visitor's first message starts a fresh one.
  const [chat, setChat] = useState<AssistantTurn[]>(CHAT);
  const [started, setStarted] = useState(false);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [chat, thinking]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || thinking) return;
    const next: AssistantTurn[] = [...(started ? chat : []), { role: 'user', content }];
    setStarted(true);
    setChat(next);
    setDraft('');
    setThinking(true);
    const reply = await askSetuAi(next.slice(-19));
    setChat([...next, { role: 'assistant', content: reply }]);
    setThinking(false);
  }

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
            max={3}
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
            <div ref={scroller} className="max-h-[420px] space-y-3 overflow-y-auto py-5">
              {chat.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 14, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.35 }}
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                    m.role === 'user'
                      ? 'ml-auto rounded-br-md bg-navy-600 text-white'
                      : 'rounded-bl-md bg-surface-muted text-text'
                  }`}
                >
                  {m.content}
                </motion.div>
              ))}
              {thinking ? (
                <div className="flex w-fit gap-1 rounded-2xl rounded-bl-md bg-surface-muted px-4 py-3">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-2 w-2 rounded-full bg-orange-400"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void send(q)}
                  disabled={thinking}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-navy-600 transition hover:border-orange-400 hover:text-orange-600"
                >
                  {q}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(draft);
              }}
              className="flex items-center gap-2 rounded-full border border-border px-2 py-1.5 pl-4 focus-within:border-orange-400"
            >
              <label htmlFor="setu-ai-input" className="sr-only">
                Message Setu AI
              </label>
              <input
                id="setu-ai-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={2000}
                placeholder="Ask in English, हिंदी or Hinglish…"
                className="min-w-0 flex-1 bg-transparent text-sm text-navy-700 outline-none placeholder:text-text-muted"
              />
              <button
                type="submit"
                disabled={thinking || !draft.trim()}
                aria-label="Send"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-400 text-navy-800 transition hover:bg-orange-300 disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </form>
          </Tilt>
        </div>
      </div>
    </section>
  );
}
