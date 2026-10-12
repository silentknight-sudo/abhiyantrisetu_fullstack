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
            className={`block text-[17px] font-extrabold tracking-tight ${onDark ? 'text-white' : 'text-navy-600'}`}
          >
            Abhiyantri <span className="text-orange-400">Setu</span>
          </span>
          <span
            className={`block text-[10px] font-medium tracking-[0.2em] uppercase ${onDark ? 'text-navy-200' : 'text-text-muted'}`}
          >
            अभियंत्री सेतु
          </span>
        </span>
      )}
    </Link>
  );
}
