'use server'

/**
 * Pre-launch email capture
 *
 * Server action invoked by the "Mobile app coming soon" sections on the
 * home page and at /app. Inserts into `public.pre_launch_signups` via the
 * anon-RLS-permitted INSERT policy.
 *
 * Security / privacy posture:
 * - Idempotent: a duplicate email (case-insensitive unique index on lower(email))
 *   returns the same success state as a fresh signup. We MUST NOT disclose
 *   whether an email is already on the list.
 * - The email is never logged. We only log error codes / messages from
 *   Supabase, and even then we scrub specific values to avoid PII leakage.
 * - `cf-ipcountry` (Cloudflare) and `user-agent` are captured best-effort for
 *   abuse triage; user_agent is truncated to 256 chars to fit the column /
 *   keep rows reasonable. Country is a 2-letter ISO code or null.
 */

import { headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase-server'

// RFC-5321 caps the localpart + domain at 320 chars, so anything longer is
// guaranteed-invalid and we reject pre-DB. Matches the RLS check constraint.
const MAX_EMAIL_LEN = 320

// Pragmatic email regex (HTML5-spec-ish — same shape as <input type="email">).
// Not perfect, but anything more elaborate either rejects legitimate emails
// or false-passes garbage anyway. The real validity check is a confirmation
// email when we actually launch.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type PreLaunchState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string }

/**
 * Subscribes an email to the pre-launch waitlist.
 *
 * Returns:
 *   - { status: 'success' } on insert OR on duplicate (PG 23505).
 *   - { status: 'error', message } on validation failure or unexpected DB error.
 *
 * `source` is a short tag (≤ 64 chars per RLS) identifying where the form
 * was rendered — e.g. 'web-home', 'web-app-page'. Useful for funnel analysis
 * without tracking the user.
 */
export async function subscribePreLaunch(
  rawEmail: string,
  source: string = 'web-home'
): Promise<PreLaunchState> {
  // ── Validate ───────────────────────────────────────────────────────────
  const email = (rawEmail ?? '').trim().toLowerCase()
  if (!email) {
    return { status: 'error', message: 'Please enter your email address.' }
  }
  if (email.length > MAX_EMAIL_LEN) {
    return { status: 'error', message: 'That email address is too long.' }
  }
  if (!EMAIL_RE.test(email)) {
    return { status: 'error', message: 'Please enter a valid email address.' }
  }

  const safeSource = (source ?? 'web-home').slice(0, 64)

  // ── Best-effort metadata (no PII) ──────────────────────────────────────
  let ipCountry: string | null = null
  let userAgent: string | null = null
  try {
    const h = await headers()
    const country = h.get('cf-ipcountry')
    if (country && country.length <= 8) ipCountry = country
    const ua = h.get('user-agent')
    if (ua) userAgent = ua.slice(0, 256)
  } catch {
    // headers() can throw outside a request context — safe to skip.
  }

  // ── Insert ─────────────────────────────────────────────────────────────
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('pre_launch_signups')
    .insert({
      email,
      source: safeSource,
      ip_country: ipCountry,
      user_agent: userAgent,
    })

  if (error) {
    // 23505 = unique_violation. The unique index is on lower(email), so a
    // repeat signup lands here. Treat as success — never disclose that the
    // address is already on the list.
    if (error.code === '23505') {
      return { status: 'success' }
    }
    // Don't log the email; only the failure shape. This keeps PII out of
    // server logs even on unexpected DB issues.
    console.error('[pre-launch] insert failed:', error.code, error.message)
    return {
      status: 'error',
      message: 'Something went wrong on our end. Please try again in a moment.',
    }
  }

  return { status: 'success' }
}
