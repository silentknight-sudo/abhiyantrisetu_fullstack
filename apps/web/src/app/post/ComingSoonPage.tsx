import Image from 'next/image';
import Link from 'next/link';
import { FLOWS, SITE } from '@/lib/content';

/** Shown at /post until launch. */
export function ComingSoonPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
      <Image src="/logo.png" alt="" width={334} height={190} className="mx-auto w-32" />
      <p className="mt-8 text-sm font-semibold tracking-[0.3em] text-orange-600 uppercase">
        Coming soon
      </p>
      <h1 className="mt-3 text-[clamp(2.6rem,6vw,4.4rem)] leading-[1.02] text-navy-700">
        Posting opens <em>very soon.</em>
      </h1>
      <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-text-muted">
        Abhiyantri Setu is launching in Greater Noida on the web and as apps for Android and iPhone.
        You&apos;ll be able to post a requirement and get quotes from verified pros within 24 hours.
      </p>
      <ul className="mt-8 flex flex-wrap justify-center gap-2">
        {FLOWS.map((f) => (
          <li
            key={f.id}
            className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-navy-700"
          >
            {f.title}
          </li>
        ))}
      </ul>
      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a
          href={`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent('Hi Abhiyantri Setu, please notify me when you launch.')}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-navy-700 px-8 py-4 font-semibold text-white transition hover:bg-navy-800"
        >
          Notify me on WhatsApp
        </a>
        <Link
          href="/"
          className="rounded-full border-2 border-navy-700/70 px-8 py-4 font-semibold text-navy-700 transition hover:bg-navy-700 hover:text-white"
        >
          Back to home
        </Link>
      </div>
      <p className="mt-6 text-sm text-text-muted">
        Or write to <span className="font-medium text-navy-700 select-all">{SITE.email}</span>
      </p>
    </section>
  );
}
