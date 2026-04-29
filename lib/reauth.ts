/**
 * Server-side password re-verification for sensitive actions.
 *
 * Pattern: when a user wants to do something risky (change email, approve a
 * broker, comp a sponsorship, etc.), we ask them to re-enter their current
 * password. The action's server function calls verifyCurrentPassword(pw)
 * before doing anything destructive.
 *
 * Why this is safer than just the existing session:
 *   - A stolen session cookie alone can't perform sensitive actions.
 *   - The CSRF protection that comes free with same-site cookies + Server
 *     Actions handles drive-by abuse, but doesn't catch "I left my laptop
 *     open at the FBO" cases. Password re-verify does.
 *
 * Why password (and not Supabase's email-OTP reauthenticate flow):
 *   - Email OTP adds a 30-60s round trip and an external dependency on
 *     Resend delivering a 6-digit code in real time. Friction:reward ratio
 *     is poor for the action mix here.
 *   - Password re-entry is the GitHub/Google "sudo" pattern. Familiar UX.
 *
 * Verification uses a fresh, in-memory-only Supabase client so a wrong
 * password attempt never disturbs the user's actual session cookies.
 */

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from './supabase-server'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export type ReauthResult = { ok: true } | { ok: false; error: string }

/**
 * Verifies the currently-signed-in user's password without touching their
 * session. Returns { ok: true } on success, { ok: false, error } otherwise.
 *
 * Throws only on programmer error (env vars missing). All user-facing
 * failures come back as { ok: false }.
 */
export async function verifyCurrentPassword(password: string | null | undefined): Promise<ReauthResult> {
  if (!password || typeof password !== 'string' || password.length < 1) {
    return { ok: false, error: 'Please enter your password to continue.' }
  }
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    console.error('[reauth] Supabase env vars missing — cannot verify password')
    return { ok: false, error: 'Authentication is misconfigured.' }
  }

  // Resolve the current user's email from the session-bound server client.
  const sessionClient = await createServerClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user?.email) return { ok: false, error: 'Not signed in.' }

  // Fresh client with no cookie storage. A failed signInWithPassword call
  // here cannot affect the user's real session — worst case is a wasted
  // network round trip.
  const probe = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  const { error } = await probe.auth.signInWithPassword({ email: user.email, password })
  if (error) {
    return { ok: false, error: 'Incorrect password. Please try again.' }
  }
  return { ok: true }
}
