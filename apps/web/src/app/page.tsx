import { BuildTracker } from '@/components/home/BuildTracker';
import { Calculator } from '@/components/home/Calculator';
import { Faq } from '@/components/home/Faq';
import { FinalCta } from '@/components/home/FinalCta';
import { Flows } from '@/components/home/Flows';
import { Hero } from '@/components/home/Hero';
import { HowItWorks } from '@/components/home/HowItWorks';
import { Marquee } from '@/components/home/Marquee';
import { QuoteForm } from '@/components/home/QuoteForm';
import { DreamHome } from '@/components/home/DreamHome';
import { Projects } from '@/components/home/Projects';
import { ServiceCards } from '@/components/home/ServiceCards';
import { Partners } from '@/components/home/Partners';
import { SetuAi } from '@/components/home/SetuAi';
import { Societies } from '@/components/home/Societies';
import { Stats } from '@/components/home/Stats';
import { TrustStack } from '@/components/home/TrustStack';
import { SectionDots } from '@/components/SectionDots';
import { FAQS, SITE } from '@/lib/content';
import { faqLd, jsonLdScript, organizationLd } from '@/lib/seo';

const jsonLd = jsonLdScript([
  organizationLd,
  {
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    name: SITE.name,
    alternateName: 'अभियंत्री सेतु',
    url: SITE.url,
    inLanguage: ['en-IN', 'hi-IN'],
    publisher: { '@id': `${SITE.url}/#organization` },
  },
  faqLd(FAQS.map((f) => [f.q, f.a] as const)),
]);

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd} />
      <Hero />
      <ServiceCards />
      <QuoteForm />
      <Marquee />
      <Flows />
      <Stats />
      <DreamHome />
      <Projects />
      <HowItWorks />
      <TrustStack />
      <BuildTracker />
      <SetuAi />
      <Calculator />
      <Societies />
      <Partners />
      <Faq />
      <FinalCta />
      <SectionDots />
    </>
  );
}
