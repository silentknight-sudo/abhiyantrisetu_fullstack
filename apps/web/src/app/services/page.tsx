import type { Metadata } from 'next';
import Link from 'next/link';
import { CITY, CITY_SERVICES, type CityService } from '@/lib/city-services';
import { SECTORS, TRADES } from '@/lib/content';
import { breadcrumbLd, jsonLdScript, organizationLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'All Services in Greater Noida',
  description:
    'Plumbers, electricians, AC repair, painting, house construction, interiors, materials and JCB rental in Greater Noida, from verified professionals.',
  alternates: { canonical: '/services' },
};

const GROUPS: CityService['group'][] = [
  'Home services',
  'Build & renovate',
  'Professionals',
  'Materials & equipment',
];

export default function ServicesIndex() {
  return (
    <div className="bg-background pt-[72px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript([
          organizationLd,
          breadcrumbLd([
            ['Home', '/'],
            ['Services', '/services'],
          ]),
        ])}
      />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h1 className="text-[clamp(2rem,5vw,3.4rem)] text-navy-600">All services in {CITY.name}</h1>
        <p className="mt-3 max-w-2xl text-lg text-text-muted">
          Pick a service to see prices, how it works and verified professionals near you.
        </p>
        {GROUPS.map((g) => (
          <section key={g} className="mt-12">
            <h2 className="text-2xl text-navy-700">{g}</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CITY_SERVICES.filter((s) => s.group === g).map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/${CITY.slug}/${s.slug}`}
                    className="block h-full rounded-3xl border border-border bg-surface p-5 transition hover:border-orange-400"
                  >
                    <span className="font-display text-lg font-bold text-navy-700">
                      {s.name} in {CITY.name}
                    </span>
                    <span lang="hi" className="ml-2 text-sm text-orange-600">
                      {s.hindi}
                    </span>
                    <span className="mt-2 block text-sm text-text-muted">{s.summary}</span>
                    <span className="mt-3 block text-sm font-semibold text-orange-600">
                      From {s.prices[0]?.[1]} →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <section className="mt-16">
          <h2 className="text-2xl text-navy-700">Services by sector</h2>
          <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {TRADES.map((t) => (
              <div key={t.slug} className="rounded-3xl border border-border bg-surface p-5">
                <h3 className="font-semibold text-navy-700">
                  {t.plural} <span className="text-sm text-orange-600">· {t.hindi}</span>
                </h3>
                <ul className="mt-3 flex flex-wrap gap-2">
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
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
