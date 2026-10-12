import Image from 'next/image';
import Link from 'next/link';

export function Logo({ onDark = false, compact = false }: { onDark?: boolean; compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Abhiyantri Setu home">
      <Image
        src={onDark ? '/logo-on-dark.png' : '/logo.png'}
        alt=""
        width={334}
        height={190}
        priority
        className="h-9 w-auto"
      />
      {!compact && (
        <span className="leading-none">
          <span
            className={`block font-display text-[22px] font-semibold tracking-wide ${onDark ? 'text-white' : 'text-navy-700'}`}
          >
            Abhiyantri Setu
          </span>
          <span
            className={`mt-0.5 block text-[10px] tracking-[0.25em] ${onDark ? 'text-navy-200' : 'text-text-muted'}`}
          >
            अभियंत्री सेतु
          </span>
        </span>
      )}
    </Link>
  );
}
