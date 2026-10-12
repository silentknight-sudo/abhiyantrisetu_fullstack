import { BuildTracker } from '@/components/home/BuildTracker';
import { Calculator } from '@/components/home/Calculator';
import { Faq } from '@/components/home/Faq';
import { FinalCta } from '@/components/home/FinalCta';
import { Flows } from '@/components/home/Flows';
import { Hero } from '@/components/home/Hero';
import { HowItWorks } from '@/components/home/HowItWorks';
import { Manifesto } from '@/components/home/Manifesto';
import { Marquee } from '@/components/home/Marquee';
import { Partners } from '@/components/home/Partners';
import { SetuAi } from '@/components/home/SetuAi';
import { Societies } from '@/components/home/Societies';
import { Stats } from '@/components/home/Stats';
import { FAQS, SITE } from '@/lib/content';

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/logo.png`,
    areaServed: 'Greater Noida, Uttar Pradesh, India',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  },
];

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <Marquee />
      <Manifesto />
      <Flows />
      <Stats />
      <HowItWorks />
      <BuildTracker />
      <SetuAi />
      <Calculator />
      <Societies />
      <Partners />
      <Faq />
      <FinalCta />
    </>
  );
}
