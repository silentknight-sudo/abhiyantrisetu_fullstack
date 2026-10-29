import type { MetadataRoute } from 'next';
import { CITY, CITY_SERVICES } from '@/lib/city-services';
import { SECTORS, SITE, TRADES } from '@/lib/content';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE.url, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE.url}/services`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    ...CITY_SERVICES.map((s) => ({
      url: `${SITE.url}/${CITY.slug}/${s.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
    ...TRADES.flatMap((t) =>
      SECTORS.map((s) => ({
        url: `${SITE.url}/services/${t.slug}/${s.slug}`,
        lastModified: now,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      })),
    ),
    { url: `${SITE.url}/post`, lastModified: now, priority: 0.5 },
  ];
}
