import Image from 'next/image';
import Link from 'next/link';
import { WaitlistForm } from '@/components/WaitlistForm';
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
      <div className="mx-auto mt-10 max-w-xl rounded-[28px] border border-border bg-surface p-6 text-left shadow-[0_30px_60px_-30px_rgba(16,36,52,0.35)] sm:p-8">
        <p className="mb-4 font-display text-2xl font-semibold text-navy-700">Get early access</p>
        <WaitlistForm source="post-page" />
      </div>
      <p className="mt-6 text-sm text-text-muted">
        Prefer WhatsApp?{' '}
        <a
          className="font-medium text-navy-700 underline"
          href={`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent('Hi Abhiyantri Setu, please notify me when you launch.')}`}
          target="_blank"
          rel="noreferrer"
        >
          Message us
        </a>{' '}
        ·{' '}
        <Link href="/" className="font-medium text-navy-700 underline">
          Back to home
        </Link>
      </p>
    </section>
  );
}
