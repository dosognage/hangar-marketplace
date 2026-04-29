import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {}

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
