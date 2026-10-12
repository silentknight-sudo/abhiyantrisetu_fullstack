import type { Metadata } from 'next';
import Link from 'next/link';
import { SECTORS, TRADES } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Services by sector in Greater Noida',
  description:
    'Verified plumbers, electricians, carpenters, painters, AC repair and waterproofing experts in every Greater Noida sector.',
};

export default function ServicesIndex() {
  return (
    <div className="bg-background pt-[72px]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h1 className="text-[clamp(2rem,5vw,3.4rem)] text-navy-600">
          Services across Greater Noida
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-text-muted">
          Pick a service and your sector to see verified professionals, starting prices and how
          booking works.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {TRADES.map((t) => (
            <section key={t.slug} className="rounded-3xl border border-border bg-surface p-6">
              <h2 className="font-display text-2xl font-semibold text-navy-700">
                {t.plural} <span className="text-sm font-medium text-orange-600">· {t.hindi}</span>
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {SECTORS.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={`/services/${t.slug}/${s.slug}`}
                      className="inline-block rounded-full border border-border px-3 py-1.5 text-sm text-text-muted transition hover:border-orange-400 hover:text-orange-600"
                    >
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
