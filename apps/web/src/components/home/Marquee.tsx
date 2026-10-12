import { SECTORS } from '@/lib/content';

export function Marquee() {
  const items = [...SECTORS, ...SECTORS];
  return (
    <div
      className="relative overflow-hidden border-y border-border bg-surface py-5"
      aria-label="Sectors we serve"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-surface to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-surface to-transparent" />
      <div className="animate-marquee flex w-max gap-10 whitespace-nowrap">
        {items.map((s, i) => (
          <span
            key={i}
            className="flex items-center gap-10 font-display text-2xl italic text-navy-600"
            aria-hidden={i >= SECTORS.length}
          >
            {s.name}
            <span className="h-1.5 w-1.5 rotate-45 bg-orange-400" />
          </span>
        ))}
      </div>
    </div>
  );
}
