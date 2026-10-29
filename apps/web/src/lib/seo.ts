import { SITE } from './content';

/** The business as search engines should know it: one shared definition for every page. */
export const organizationLd = {
  '@type': ['Organization', 'HomeAndConstructionBusiness'],
  '@id': `${SITE.url}/#organization`,
  name: SITE.name,
  alternateName: 'अभियंत्री सेतु',
  url: SITE.url,
  logo: `${SITE.url}/logo.png`,
  image: `${SITE.url}/projects/hero-house.jpg`,
  telephone: SITE.phone.replace(/\s/g, ''),
  email: SITE.email,
  priceRange: '₹₹',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Greater Noida',
    addressRegion: 'Uttar Pradesh',
    postalCode: '201310',
    addressCountry: 'IN',
  },
  areaServed: { '@type': 'City', name: 'Greater Noida' },
};

export const breadcrumbLd = (items: [name: string, path: string][]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name,
    item: `${SITE.url}${path}`,
  })),
});

export const faqLd = (faqs: readonly (readonly [string, string])[]) => ({
  '@type': 'FAQPage',
  mainEntity: faqs.map(([q, a]) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
});

/** Renders one JSON-LD graph; pass the nodes for the page. */
export function jsonLdScript(nodes: object[]) {
  return { __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }) };
}
