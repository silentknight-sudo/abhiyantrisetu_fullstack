import { BadgeCheck, Clock3, ShieldCheck, Star } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Reveal } from '@/components/Reveal';
import { SECTORS, SITE, TRADES } from '@/lib/content';

type Params = { trade: string; sector: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return TRADES.flatMap((t) => SECTORS.map((s) => ({ trade: t.slug, sector: s.slug })));
}

function resolve({ trade, sector }: Params) {
  const t = TRADES.find((x) => x.slug === trade);
  const s = SECTORS.find((x) => x.slug === sector);
  return t && s ? { t, s } : null;
}

const priceUnit = (slug: string) =>
  slug === 'painter' || slug === 'waterproofing' ? '/sqft' : ' visit';

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const r = resolve(await params);
  if (!r) return {};
  return {
    title: `${r.t.name} in ${r.s.name}, Greater Noida`,
    description: `Book a verified ${r.t.name.toLowerCase()} in ${r.s.name}, Greater Noida. Prices from ₹${r.t.from}${priceUnit(r.t.slug)}, start codes on site, and quotes within 24 hours.`,
    alternates: { canonical: `/services/${r.t.slug}/${r.s.slug}` },
  };
}

export default async function TradeSectorPage({ params }: { params: Promise<Params> }) {
  const r = resolve(await params);
  if (!r) notFound();
  const { t, s } = r;
  const nearby = SECTORS.filter((x) => x.slug !== s.slug).slice(0, 6);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: t.name,
    name: `${t.name} in ${s.name}, Greater Noida`,
    provider: {
      '@type': 'LocalBusiness',
      name: SITE.name,
      url: SITE.url,
      image: `${SITE.url}/logo.png`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Greater Noida',
        postalCode: s.pincode,
        addressRegion: 'UP',
        addressCountry: 'IN',
      },
    },
    areaServed: {
      '@type': 'Place',
      name: `${s.name}, Greater Noida`,
      geo: { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lng },
    },
    offers: { '@type': 'Offer', priceCurrency: 'INR', price: t.from },
  };

  return (
    <div className="bg-background pt-[72px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="bg-surface-muted text-navy-700">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <nav className="text-sm text-text-muted">
            <Link href="/services" className="hover:text-navy-700">
              Services
            </Link>{' '}
            / {t.name} / {s.name}
          </nav>
          <Reveal>
            <h1 className="mt-4 max-w-3xl text-[clamp(2.2rem,5.5vw,4rem)] leading-[1.03]">
              {t.name} in <em>{s.name}</em>, Greater Noida
            </h1>
          </Reveal>
          <p className="mt-4 text-lg text-text-muted">
            {t.hindi} · from ₹{t.from}
            {priceUnit(t.slug)}
          </p>
          <Link
            href="/post?type=service"
            className="mt-8 inline-block rounded-full bg-navy-700 px-7 py-4 font-semibold text-white transition hover:bg-navy-800"
          >
            Book a {t.name.toLowerCase()} in {s.name}
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-4">
        {[
          {
            icon: BadgeCheck,
            title: 'Verified locally',
            body: `${t.plural} serving ${s.name} pass KYC and police checks.`,
          },
          {
            icon: Clock3,
            title: 'Fast response',
            body: 'Quotes within 24 hours; urgent visits often the same day.',
          },
          {
            icon: ShieldCheck,
            title: 'Start code',
            body: 'Work starts only when you share your 4-digit code.',
          },
          { icon: Star, title: 'Real reviews', body: 'Only customers who hired can review.' },
        ].map(({ icon: Icon, title, body }, i) => (
          <Reveal
            key={title}
            delay={i * 0.06}
            className="rounded-3xl border border-border bg-surface p-6"
          >
            <Icon className="text-orange-500" size={22} />
            <h2 className="mt-4 font-display text-2xl font-semibold text-navy-700">{title}</h2>
            <p className="mt-1 text-sm text-text-muted">{body}</p>
          </Reveal>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <h2 className="text-3xl text-navy-700">{t.plural} in nearby sectors</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {nearby.map((n) => (
            <Link
              key={n.slug}
              href={`/services/${t.slug}/${n.slug}`}
              className="rounded-full border border-border px-4 py-2 text-sm text-text-muted hover:border-orange-400 hover:text-orange-600"
            >
              {t.name} in {n.name}
            </Link>
          ))}
        </div>
        <h2 className="mt-10 text-3xl text-navy-700">Other services in {s.name}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {TRADES.filter((x) => x.slug !== t.slug).map((x) => (
            <Link
              key={x.slug}
              href={`/services/${x.slug}/${s.slug}`}
              className="rounded-full border border-border px-4 py-2 text-sm text-text-muted hover:border-orange-400 hover:text-orange-600"
            >
              {x.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
