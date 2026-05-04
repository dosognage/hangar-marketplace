// Sentry server-side runtime configuration.
// Loaded automatically by `@sentry/nextjs` for any code running in Node.js
// (server components, server actions, API routes).

import * as Sentry from '@sentry/nextjs'
import { scrubEvent, scrubBreadcrumb } from '@/lib/sentry-scrub'

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  // 10% trace sampling — enough to spot slow paths without burning quota.
  tracesSampleRate: 0.1,
  // PII hardening — see lib/sentry-scrub.ts. Critical on the server side
  // because every API route's request body + headers (including the
  // `cookie` header which holds the user's Supabase session) would
  // otherwise be attached to errors.
  sendDefaultPii: false,
  beforeSend: scrubEvent,
  beforeBreadcrumb: scrubBreadcrumb,
  // Ignore noisy expected errors. Add to this list as patterns surface.
  ignoreErrors: [
    'NEXT_REDIRECT',          // Next.js's internal redirect signal — not a bug
    'NEXT_NOT_FOUND',
  ],
  // Don't send events from local dev unless someone explicitly opts in.
  enabled: !!dsn && process.env.NODE_ENV === 'production',
})
