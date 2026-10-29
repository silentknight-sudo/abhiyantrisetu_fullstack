import { Compass, HardHat, Package, Truck, Wrench } from 'lucide-react';
import { Reveal } from '../Reveal';

const CARDS = [
  {
    icon: HardHat,
    title: 'Build or Renovate',
    body: 'Find contractors, architects and engineers.',
  },
  {
    icon: Wrench,
    title: 'Book a Home Service',
    body: 'Plumbing, electrical, painting, cleaning & more.',
  },
  { icon: Package, title: 'Buy Materials', body: 'Cement, steel, tiles, paints and more.' },
  { icon: Truck, title: 'Rent Equipment', body: 'JCB, scaffolding, mixers and more.' },
  {
    icon: Compass,
    title: 'Find a Professional',
    body: 'Architects, engineers, designers & consultants.',
  },
] as const;

/** The five things a visitor can do on Setu; each card leads to the quote form. */
export function ServiceCards() {
  return (
    <section aria-label="Our services" className="bg-surface py-16">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-5">
        {CARDS.map(({ icon: Icon, title, body }, i) => (
          <Reveal key={title} delay={i * 0.06} className="h-full">
            <a
              href="#quote"
              className="group flex h-full flex-col rounded-3xl border border-border bg-background p-6 transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-[0_24px_60px_-30px_rgba(26,58,82,0.4)]"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-navy-600 text-white transition group-hover:bg-orange-500">
                <Icon size={22} />
              </span>
              <h3 className="mt-5 font-display text-lg font-bold text-navy-700">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{body}</p>
              <span className="mt-auto pt-5 text-sm font-bold text-orange-600">Get a quote →</span>
            </a>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
