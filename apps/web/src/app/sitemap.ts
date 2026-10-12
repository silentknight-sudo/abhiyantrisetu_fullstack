import type { MetadataRoute } from 'next';
import { SECTORS, SITE, TRADES } from '@/lib/content';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE.url, lastModified: now, priority: 1 },
    { url: `${SITE.url}/post`, lastModified: now, priority: 0.9 },
    { url: `${SITE.url}/services`, lastModified: now, priority: 0.8 },
    ...TRADES.flatMap((t) =>
      SECTORS.map((s) => ({
        url: `${SITE.url}/services/${t.slug}/${s.slug}`,
        lastModified: now,
        priority: 0.7,
      })),
    ),
  ];
}
