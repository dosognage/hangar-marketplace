// Sentry browser-side runtime configuration.
// Loaded for any code running in the browser (client components, hooks).

import * as Sentry from '@sentry/nextjs'
import { scrubEvent, scrubBreadcrumb } from '@/lib/sentry-scrub'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  // 10% trace sampling. Browser perf is less critical than server perf —
  // bump this only if you're investigating a specific UX slowness.
  tracesSampleRate: 0.1,
  // Replay 10% of normal sessions and 100% of sessions with errors.
  // Useful for reproducing user-reported bugs without burning storage on
  // every uneventful pageview.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  // PII hardening — see lib/sentry-scrub.ts. False here disables the
  // default IP-address + cookie capture; the beforeSend hook then
  // strips sensitive headers + body fields belt-and-braces.
  sendDefaultPii: false,
  beforeSend: scrubEvent,
  beforeBreadcrumb: scrubBreadcrumb,
  // Replay integration: mask all text content + block media. Even though
  // sample rates are low, when a session IS recorded it must not capture
  // form input values or photos.
  integrations: [
    Sentry.replayIntegration({
      maskAllText:  true,
      blockAllMedia: true,
      maskAllInputs: true,
    }),
  ],
  ignoreErrors: [
    'NEXT_REDIRECT',
    'NEXT_NOT_FOUND',
    // Browser extensions / quota errors that aren't ours to fix
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
  ],
  enabled: !!dsn && process.env.NODE_ENV === 'production',
})
