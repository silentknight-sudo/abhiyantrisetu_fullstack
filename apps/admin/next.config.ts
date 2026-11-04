import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Staff-only: never let search engines or other sites frame it.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    ];
  },
  // Optional same-origin API: with API_PROXY_URL set (and NEXT_PUBLIC_API_URL empty),
  // /v1/* is forwarded to the API, so the portal works where only its own port is reachable.
  async rewrites() {
    const api = process.env.API_PROXY_URL;
    return api ? [{ source: '/v1/:path*', destination: `${api}/v1/:path*` }] : [];
  },
};

export default config;
