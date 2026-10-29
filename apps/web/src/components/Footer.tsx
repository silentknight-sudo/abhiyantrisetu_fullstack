import Link from 'next/link';
import { LAUNCHED } from '@/lib/launch';
import { CITY, CITY_SERVICES } from '@/lib/city-services';
import { SECTORS, SITE } from '@/lib/content';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="bg-navy-900 text-navy-200">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo onDark />
          <p className="mt-5 max-w-sm text-sm leading-relaxed">
            {SITE.tagline} Verified pros, transparent quotes and milestone payments across{' '}
            {SITE.city}.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {/* Store badges become links once the apps are published. */}
            {['App Store', 'Google Play'].map((store) => (
              <button
                key={store}
                type="button"
                data-coming-soon={`The ${store} app`}
                className="rounded-xl border border-white/15 px-4 py-2 text-left text-xs transition hover:border-orange-300"
              >
                <span className="block text-[10px] text-orange-300">
                  {LAUNCHED
                    ? store === 'App Store'
                      ? 'Download on the'
                      : 'Get it on'
                    : 'Coming soon on'}
                </span>
                <span className="font-semibold text-white">{store}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Services</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {CITY_SERVICES.map((s) => (
              <li key={s.slug}>
                <Link className="hover:text-orange-300" href={`/${CITY.slug}/${s.slug}`}>
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Sectors</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {SECTORS.slice(0, 7).map((s) => (
              <li key={s.slug}>
                <Link className="hover:text-orange-300" href={`/services/plumber/${s.slug}`}>
                  {s.name}
                </Link>
              </li>
            ))}
            <li>
              <Link className="font-semibold text-orange-300" href="/services">
                All areas →
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Company</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link className="hover:text-orange-300" href="/#partners">
                Become a partner
              </Link>
            </li>
            <li>
              <Link className="hover:text-orange-300" href="/#societies">
                Societies & RWAs
              </Link>
            </li>
            <li>
              <Link className="hover:text-orange-300" href="/#faq">
                FAQ
              </Link>
            </li>
            <li>
              <a className="hover:text-orange-300" href={`mailto:${SITE.email}`}>
                {SITE.email}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-navy-300 sm:flex-row sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {SITE.name}. Made in Greater Noida.
          </p>
          <p>
            Grievance officer (DPDP Act, 2023):{' '}
            <a className="underline hover:text-white" href={`mailto:${SITE.grievanceEmail}`}>
              {SITE.grievanceEmail}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
