import type { NextConfig } from 'next';

/**
 * The portal may only talk to itself and the API. Next.js inlines small bootstrap scripts,
 * hence 'unsafe-inline' for scripts; everything else is locked to this origin.
 */
const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" +
    (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${api}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

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
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
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
