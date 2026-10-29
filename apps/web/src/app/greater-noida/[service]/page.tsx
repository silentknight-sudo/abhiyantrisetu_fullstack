import { BadgeCheck, Clock3, IndianRupee, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CITY, CITY_SERVICES, findCityService } from '@/lib/city-services';
import { SECTORS, SITE } from '@/lib/content';
import { breadcrumbLd, faqLd, jsonLdScript, organizationLd } from '@/lib/seo';

type Params = { service: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return CITY_SERVICES.map((s) => ({ service: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const s = findCityService((await params).service);
  if (!s) return {};
  // Kept under ~60 and ~155 characters so Google shows them in full.
  const from = s.prices[0]?.[1].split('–')[0];
  const title = `${s.name} in ${CITY.name} | From ${from}`;
  const description = `${s.summary} Verified ${s.plural.toLowerCase()} in ${CITY.name}, clear prices, pay safely.`;
  const path = `/${CITY.slug}/${s.slug}`;
  return {
    title: { absolute: title },
    description,
    keywords: [`${s.name} ${CITY.name}`, ...s.searches, `${s.hindi} ${CITY.hindi}`],
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: 'website' },
  };
}

export default async function CityServicePage({ params }: { params: Promise<Params> }) {
  const s = findCityService((await params).service);
  if (!s) notFound();
  const path = `/${CITY.slug}/${s.slug}`;
  const related = CITY_SERVICES.filter((x) => x.slug !== s.slug && x.group === s.group)
    .concat(CITY_SERVICES.filter((x) => x.group !== s.group))
    .slice(0, 8);

  const ld = jsonLdScript([
    organizationLd,
    breadcrumbLd([
      ['Home', '/'],
      ['Services', '/services'],
      [`${s.name} in ${CITY.name}`, path],
    ]),
    {
      '@type': 'Service',
      '@id': `${SITE.url}${path}#service`,
      name: `${s.name} in ${CITY.name}`,
      serviceType: s.name,
      description: s.intro,
      provider: { '@id': `${SITE.url}/#organization` },
      areaServed: [
        { '@type': 'City', name: CITY.name },
        ...SECTORS.map((x) => ({ '@type': 'Place', name: `${x.name}, ${CITY.name}` })),
      ],
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: `${s.name} prices in ${CITY.name}`,
        itemListElement: s.prices.map(([job, price]) => ({
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: job },
          priceCurrency: 'INR',
          description: `${price} (indicative, before site visit)`,
        })),
      },
    },
    faqLd(s.faqs),
  ]);

  return (
    <div className="bg-background pt-[72px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={ld} />
      <section className="bg-surface-muted text-navy-700">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <nav aria-label="Breadcrumb" className="text-sm text-text-muted">
            <Link href="/" className="hover:text-navy-700">
              Home
            </Link>{' '}
            /{' '}
            <Link href="/services" className="hover:text-navy-700">
              Services
            </Link>{' '}
            / {s.name}
          </nav>
          <h1 className="mt-4 max-w-4xl text-balance text-[clamp(2.1rem,5.5vw,4rem)] leading-[1.04]">
            {s.name} in <em>{CITY.name}</em>
          </h1>
          <p lang="hi" className="mt-2 text-lg font-semibold text-orange-600">
            {s.hindi} · {CITY.hindi}
          </p>
          <p className="mt-5 max-w-2xl text-lg text-text-muted">{s.intro}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/post?type=${s.postType}`}
              className="rounded-full bg-navy-700 px-7 py-4 text-center font-semibold text-white transition hover:bg-navy-800"
            >
              Get a quote
            </Link>
            <a
              href={`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(`Hi Abhiyantri Setu, I need ${s.name.toLowerCase()} in Greater Noida.`)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border-2 border-navy-700/20 px-7 py-4 text-center font-semibold transition hover:bg-white/40"
            >
              WhatsApp {SITE.phone}
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h2 className="text-[clamp(1.6rem,3vw,2.3rem)] text-navy-700">
            {s.name} prices in {CITY.name}
          </h2>
          <p className="mt-2 text-sm text-text-muted">
            Indicative 2026 rates before a site visit. Your quote lists every item, with GST where
            it applies.
          </p>
          <div className="mt-6 overflow-x-auto rounded-3xl border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-navy-600">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Job
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Typical price
                  </th>
                </tr>
              </thead>
              <tbody>
                {s.prices.map(([job, price]) => (
                  <tr key={job} className="border-t border-border">
                    <td className="px-5 py-3 text-navy-700">{job}</td>
                    <td className="px-5 py-3 font-semibold whitespace-nowrap text-orange-600 tabular-nums">
                      {price}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <ul className="grid content-start gap-4">
          {[
            [BadgeCheck, 'Verified professionals', 'Aadhaar, PAN, bank and face-match checks.'],
            [IndianRupee, 'Clear prices', 'Itemised quotes before any work starts.'],
            [Clock3, 'Quick response', 'Quotes within 24 hours, urgent visits same day.'],
            [ShieldCheck, 'Pay safely', 'Money released only when you confirm the work.'],
          ].map(([Icon, title, body]) => {
            const I = Icon as typeof BadgeCheck;
            return (
              <li
                key={title as string}
                className="flex gap-4 rounded-2xl border border-border bg-surface p-4"
              >
                <I className="mt-0.5 shrink-0 text-orange-500" size={20} />
                <span>
                  <span className="block font-semibold text-navy-700">{title as string}</span>
                  <span className="text-sm text-text-muted">{body as string}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {s.sectorTrade ? (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <h2 className="text-[clamp(1.6rem,3vw,2.3rem)] text-navy-700">
            {s.plural} near you in {CITY.name}
          </h2>
          <ul className="mt-5 flex flex-wrap gap-2">
            {SECTORS.map((x) => (
              <li key={x.slug}>
                <Link
                  href={`/services/${s.sectorTrade}/${x.slug}`}
                  className="inline-block rounded-full border border-border px-4 py-2 text-sm text-text-muted transition hover:border-orange-400 hover:text-orange-600"
                >
                  {s.name} in {x.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="bg-surface py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-[clamp(1.6rem,3vw,2.3rem)] text-navy-700">
            {s.name} in {CITY.name}: questions people ask
          </h2>
          <div className="mt-6 divide-y divide-border">
            {s.faqs.map(([q, a]) => (
              <details key={q} className="group py-4">
                <summary className="cursor-pointer list-none font-semibold text-navy-700">
                  {q}
                </summary>
                <p className="mt-2 text-text-muted">{a}</p>
              </details>
            ))}
          </div>
          <p className="mt-8 text-sm text-text-muted">
            People also search for: {s.searches.join(' · ')}.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-[clamp(1.6rem,3vw,2.3rem)] text-navy-700">
          More services in {CITY.name}
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((x) => (
            <li key={x.slug}>
              <Link
                href={`/${CITY.slug}/${x.slug}`}
                className="block h-full rounded-2xl border border-border bg-surface p-4 transition hover:border-orange-400"
              >
                <span className="font-semibold text-navy-700">{x.name}</span>
                <span className="mt-1 block text-sm text-text-muted">{x.summary}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
