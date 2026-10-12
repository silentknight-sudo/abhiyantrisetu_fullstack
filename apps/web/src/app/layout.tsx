import { cssStylesheet } from '@setu/ui-tokens';
import type { Metadata, Viewport } from 'next';
import { Noto_Sans, Noto_Sans_Devanagari } from 'next/font/google';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { ScrollProgress } from '@/components/ScrollProgress';
import { SmoothScroll } from '@/components/SmoothScroll';
import { SITE } from '@/lib/content';
import './globals.css';

const noto = Noto_Sans({ subsets: ['latin'], variable: '--font-noto', display: 'swap' });
const notoDeva = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '600', '700'],
  variable: '--font-noto-deva',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name}: verified home services, construction & materials in ${SITE.city}`,
    template: `%s | ${SITE.name}`,
  },
  description:
    'Book verified plumbers and electricians, renovate or build your house with milestone payments, buy materials and rent equipment in Greater Noida.',
  openGraph: { siteName: SITE.name, type: 'website', locale: 'en_IN', images: ['/logo.png'] },
};

export const viewport: Viewport = { themeColor: '#1A3A52' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" data-theme="light" className={`${noto.variable} ${notoDeva.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: cssStylesheet() }} />
      </head>
      <body className="font-sans">
        <SmoothScroll>
          <ScrollProgress />
          <Header />
          <main>{children}</main>
          <Footer />
        </SmoothScroll>
      </body>
    </html>
  );
}
