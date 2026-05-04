import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

/**
 * Security headers applied to every response.
 *
 * Each header here closes a different attack class:
 *
 *   • X-Frame-Options: DENY
 *       Prevents the site from being framed inside another page.
 *       Stops clickjacking — an attacker overlays an invisible
 *       iframe of our site over their UI and tricks users into
 *       clicking on our buttons (e.g. "Delete account").
 *       Modern equivalent is CSP's frame-ancestors, but X-Frame-
 *       Options has wider browser support and we don't iframe our
 *       own pages, so DENY is the right default.
 *
 *   • X-Content-Type-Options: nosniff
 *       Forces browsers to honour our Content-Type. Without it,
 *       a user-uploaded file we serve as image/* could be sniffed
 *       as text/html and executed in the user's session. Critical
 *       defence around the avatar / listing-photo upload paths.
 *
 *   • Referrer-Policy: strict-origin-when-cross-origin
 *       When users click external links from our pages, we leak
 *       only the origin (https://hangarmarketplace.com), not the
 *       full path or query. Prevents leaking listing IDs, search
 *       params, or auth-related URLs to third parties.
 *
 *   • Permissions-Policy: camera=(), microphone=(), geolocation=()
 *       Disables browser features we don't use. Even if an XSS
 *       sneaks in, it can't pop a camera or geolocation prompt.
 *
 *   • Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
 *       Tells browsers "always use HTTPS for this domain and every
 *       subdomain for the next 2 years". Defeats SSL-stripping
 *       MITM attacks. preload is set so the domain can be added to
 *       the Chrome HSTS preload list (hstspreload.org).
 */
const securityHeaders = [
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to every route.
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

// Only wrap with Sentry's plugin when a DSN is actually present at build
// time. If the env var doesn't propagate to Vercel for whatever reason, the
// build still succeeds — we just skip sourcemap upload + auto-instrumentation.
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

const finalConfig: NextConfig = dsn
  ? withSentryConfig(nextConfig, {
      org:     process.env.SENTRY_ORG     ?? 'hangar-marketplace',
      project: process.env.SENTRY_PROJECT ?? 'javascript-nextjs',
      // Suppress webpack noise in CI/build logs.
      silent: !process.env.CI,
      // Tunnel client SDK requests through your own domain so ad blockers
      // don't drop events. ~/monitoring proxies to Sentry transparently.
      tunnelRoute: '/monitoring',
      // Disable Sentry's logger override in dev so console output stays clean.
      disableLogger: true,
    })
  : nextConfig

export default finalConfig
