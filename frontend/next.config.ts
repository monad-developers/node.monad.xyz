import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV === 'development'

// Hosts the production deploy has always connected to.
const DEFAULT_WS_ORIGINS = [
  'wss://monode-mainnet.monadinfra.com',
  'wss://execution-events-backend-example.molandak.org',
]

/**
 * WebSocket origins the browser may connect to: the defaults plus the origins
 * of the configured primary and fallback event endpoints, so a new endpoint
 * only needs an env var change.
 */
function wsConnectSources(): string[] {
  const configured = [
    process.env.NEXT_PUBLIC_EVENTS_WS_URL,
    process.env.NEXT_PUBLIC_EVENTS_WS_FALLBACK_URL,
  ].flatMap((url) => {
    if (!url) return []
    try {
      return [new URL(url).origin]
    } catch {
      console.warn(`Ignoring invalid WebSocket URL in CSP: ${url}`)
      return []
    }
  })
  return [...new Set([...DEFAULT_WS_ORIGINS, ...configured])]
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        pathname: '/monad-crypto/token-list/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com${isDev ? " 'unsafe-eval'" : ''}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://raw.githubusercontent.com",
              "font-src 'self'",
              `connect-src 'self' ${wsConnectSources().join(' ')}`,
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              'upgrade-insecure-requests',
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
