/**
 * Sentry beforeSend hook — strips PII out of every event before it leaves
 * the user's browser or our server.
 *
 * Why this exists
 * ---------------
 * By default Sentry captures plenty of personally-identifying data:
 *   - User IP address (sendDefaultPii=true is the default)
 *   - Request headers (including the `cookie` header → entire session)
 *   - Request bodies (so a contact-form 500 sends the full message + email)
 *   - Form-field values in breadcrumbs (every keystroke into a password
 *     field can end up in the issue trace)
 *
 * This is fine for an internal tool but for a production app it's:
 *   - A privacy issue (we're sending user content to a 3rd party)
 *   - A regulatory issue (GDPR/CCPA/etc — even though we're not marketing
 *     to EU, US state laws like CCPA apply)
 *   - A breach-amplification issue (if Sentry is ever compromised, the
 *     attacker gets every error trace which is a goldmine)
 *
 * Strategy
 * --------
 * 1. Set `sendDefaultPii: false` at init.
 * 2. In beforeSend, additionally redact a known list of sensitive headers
 *    and any `request.data` fields whose key looks sensitive.
 * 3. Drop client-side breadcrumbs that include form input values.
 */

import type { ErrorEvent, EventHint, Breadcrumb } from '@sentry/nextjs'

/** Headers we never want to send. lowercase. */
const REDACT_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-supabase-auth',
  'x-csrf-token',
  'cf-turnstile-response',
])

/** Body field names that should be redacted regardless of context. */
const REDACT_FIELD_PATTERNS: RegExp[] = [
  /password/i,
  /token/i,
  /secret/i,
  /api[_-]?key/i,
  /authorization/i,
  /session/i,
  /turnstile/i,
]

function shouldRedactField(name: string): boolean {
  return REDACT_FIELD_PATTERNS.some(re => re.test(name))
}

/** Recursively redact sensitive keys in a JSON-ish object/array. */
function redactObject(obj: unknown, depth = 0): unknown {
  if (depth > 6 || obj == null) return obj
  if (Array.isArray(obj)) return obj.map(v => redactObject(v, depth + 1))
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = shouldRedactField(k) ? '[redacted]' : redactObject(v, depth + 1)
    }
    return out
  }
  return obj
}

export function scrubEvent(event: ErrorEvent, _hint: EventHint): ErrorEvent {
  // Strip the IP address Sentry attaches by default.
  if (event.user) {
    event.user.ip_address = undefined
  }

  // Strip sensitive headers from any request context.
  if (event.request?.headers) {
    const cleaned: Record<string, string> = {}
    for (const [name, value] of Object.entries(event.request.headers)) {
      cleaned[name] = REDACT_HEADERS.has(name.toLowerCase()) ? '[redacted]' : String(value)
    }
    event.request.headers = cleaned
  }

  // Strip request body / cookies. Sentry's runtime accepts string for
  // `cookies` even though the type narrows it differently across versions.
  if (event.request) {
    const req = event.request as Record<string, unknown>
    if (req.cookies) req.cookies = '[redacted]'
    if (req.data) req.data = redactObject(req.data)
  }

  // Recursively scrub `extra` and `contexts` payloads — these are where
  // homegrown calls to Sentry.captureException(err, { extra: ... }) end up.
  if (event.extra) event.extra = redactObject(event.extra) as Record<string, unknown>
  if (event.contexts) event.contexts = redactObject(event.contexts) as typeof event.contexts

  return event
}

/**
 * Drop breadcrumbs that capture form-input values. Sentry's "ui.input"
 * breadcrumb records every keystroke into a form field; if Replay is
 * also enabled it records the value. Strip both.
 */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category === 'ui.input') {
    // Drop the value — keep the breadcrumb itself for navigation context.
    if (breadcrumb.message) {
      breadcrumb.message = '[redacted form input]'
    }
    if (breadcrumb.data) {
      breadcrumb.data = redactObject(breadcrumb.data) as typeof breadcrumb.data
    }
  }
  return breadcrumb
}
