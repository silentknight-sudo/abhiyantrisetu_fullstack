import Image from 'next/image';
import { Reveal, SectionLabel } from '../Reveal';

/** Project types and counts from the Abhiyantri Setu portfolio. */
const PROJECTS = [
  { img: 'residential', title: 'Residential Building', count: '120+ projects' },
  { img: 'commercial', title: 'Commercial Building', count: '85+ projects' },
  { img: 'interior', title: 'Interior Projects', count: '150+ projects' },
  { img: 'renovation', title: 'Renovation Projects', count: '95+ projects' },
  { img: 'villa', title: 'Villa Construction', count: '60+ projects' },
  { img: 'industrial', title: 'Industrial Projects', count: '40+ projects' },
] as const;

export function Projects() {
  return (
    <section id="projects" className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionLabel>Construction projects</SectionLabel>
        <h2 className="max-w-2xl text-balance text-[clamp(2rem,4.4vw,3.4rem)] leading-[1.05] text-navy-700">
          End-to-end solutions <em>for your dream project.</em>
        </h2>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PROJECTS.map((p, i) => (
            <Reveal key={p.img} delay={(i % 3) * 0.08}>
              <a
                href="#quote"
                className="group relative block aspect-[4/3] overflow-hidden rounded-3xl"
              >
                <Image
                  src={`/projects/${p.img}.jpg`}
                  alt={p.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-900/85 via-navy-900/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <p className="font-display text-xl font-bold">{p.title}</p>
                  <p className="mt-1 text-sm text-orange-300">{p.count}</p>
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
