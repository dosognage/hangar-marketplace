// Sentry server-side runtime configuration.
// Loaded automatically by `@sentry/nextjs` for any code running in Node.js
// (server components, server actions, API routes).

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  // 10% trace sampling — enough to spot slow paths without burning quota.
  tracesSampleRate: 0.1,
  // Ignore noisy expected errors. Add to this list as patterns surface.
  ignoreErrors: [
    'NEXT_REDIRECT',          // Next.js's internal redirect signal — not a bug
    'NEXT_NOT_FOUND',
  ],
  // Don't send events from local dev unless someone explicitly opts in.
  enabled: !!dsn && process.env.NODE_ENV === 'production',
})
