// Sentry edge-runtime configuration.
// Loaded when middleware or any route configured with `runtime = 'edge'`
// runs on Vercel's edge infrastructure.

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  tracesSampleRate: 0.1,
  ignoreErrors: ['NEXT_REDIRECT', 'NEXT_NOT_FOUND'],
  enabled: !!dsn && process.env.NODE_ENV === 'production',
})
