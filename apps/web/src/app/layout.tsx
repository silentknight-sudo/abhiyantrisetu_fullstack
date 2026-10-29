import { cssStylesheet } from '@setu/ui-tokens';
import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_Devanagari, Plus_Jakarta_Sans } from 'next/font/google';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Analytics } from '@/components/Analytics';
import { ComingSoonProvider } from '@/components/ComingSoon';
import { ScrollProgress } from '@/components/ScrollProgress';
import { SmoothScroll } from '@/components/SmoothScroll';
import { SITE } from '@/lib/content';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});
const notoDeva = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '600', '700'],
  variable: '--font-noto-deva',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name}: Home Services, House Construction & Materials in ${SITE.city}`,
    template: `%s | ${SITE.name}`,
  },
  description:
    'Verified plumbers, electricians, painters and contractors in Greater Noida. Build or renovate with milestone payments, buy materials, rent a JCB.',
  keywords: [
    'home services Greater Noida',
    'plumber Greater Noida',
    'electrician Greater Noida',
    'house construction Greater Noida',
    'construction cost per sq ft Greater Noida',
    'interior designer Greater Noida',
    'building material supplier Greater Noida',
    'JCB on rent Greater Noida',
    'Abhiyantri Setu',
  ],
  applicationName: SITE.name,
  alternates: { canonical: '/' },
  openGraph: {
    siteName: SITE.name,
    type: 'website',
    locale: 'en_IN',
    url: '/',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  // Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION to the code from Google Search Console.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
  formatDetection: { telephone: true },
};

export const viewport: Viewport = { themeColor: '#F6EFE3' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-IN"
      data-theme="light"
      className={`${inter.variable} ${jakarta.variable} ${notoDeva.variable}`}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: cssStylesheet() }} />
      </head>
      <body className="font-sans">
        <SmoothScroll>
          <ScrollProgress />
          <Header />
          <main>{children}</main>
          <Footer />
          <ComingSoonProvider />
          <Analytics />
        </SmoothScroll>
      </body>
    </html>
  );
}
