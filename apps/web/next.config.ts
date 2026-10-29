import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // One address for search engines: send the bare domain to www permanently.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'abhiyantrisetu.com' }],
        destination: 'https://www.abhiyantrisetu.com/:path*',
        permanent: true,
      },
      // Pages from the previous site, so their Google ranking and old links carry over.
      ...(
        [
          ['/about', '/#how'],
          ['/contact', '/#quote'],
          ['/ai', '/#ai'],
          ['/auth', '/post'],
          ['/jobs', '/#partners'],
          ['/provider-signup', '/#partners'],
          ['/services/home-services', '/services'],
          ['/services/build-renovate', '/greater-noida/home-renovation'],
          ['/services/buy-materials', '/greater-noida/building-materials'],
          ['/services/find-professional', '/greater-noida/architect'],
          ['/services/rent-equipment', '/greater-noida/jcb-equipment-rental'],
        ] as const
      ).map(([source, destination]) => ({ source, destination, permanent: true })),
    ];
  },
};

export default config;
