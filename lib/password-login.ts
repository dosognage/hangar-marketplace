/**
 * Email + password sign-in for the website, used by POST /api/auth/login.
 *
 * This used to be a Server Action that ended in redirect(next). That made
 * the browser swap from the signed-out login page to the signed-in layout
 * as a client-side transition inside the action's response, and in
 * production that transition kept landing on Next's "This page couldn't
 * load" screen even though the sign-in had worked (a manual reload always
 * fixed it). Now the login page posts here with fetch and, on success,
 * does a full page load of `redirectTo`: the reload, done for the user.
 * A Route Handler (not a Server Action) matters: setting the session
 * cookie in an action re-renders the page in place, which is the same
 * transition we are avoiding.
 */

import { headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase-server'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { recordAndAlertLogin } from '@/lib/loginAlerts'
import { safeNextPath } from '@/lib/safe-redirect'

export type PasswordLoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string; status: number }

/**
 * Best-effort client IP for Turnstile siteverify. Cloudflare's API accepts an
 * optional `remoteip` to cross-check the token. We read x-forwarded-for first
 * (Vercel sets this), then fall back to other common headers. Failing to find
 * one is fine — Turnstile still verifies based on the token alone.
 */
export async function getClientIp(): Promise<string | undefined> {
  try {
    const h = await headers()
    const fwd = h.get('x-forwarded-for')
    if (fwd) return fwd.split(',')[0]?.trim()
    return h.get('x-real-ip') ?? h.get('cf-connecting-ip') ?? undefined
  } catch {
    return undefined
  }
}

export async function passwordLogin(formData: FormData): Promise<PasswordLoginResult> {
  const email = (formData.get('email') as string | null)?.trim()
  const password = formData.get('password') as string | null
  // Sanitize `next` aggressively — see lib/safe-redirect.ts. Accepting
  // attacker-controlled URLs here turns a successful login into a
  // credential-reharvest phishing handoff (open-redirect).
  const next = safeNextPath(formData.get('next') as string | null)

  if (!email || !password) {
    return { ok: false, error: 'Email and password are required.', status: 400 }
  }

  // Bot-protection gate. Mirrors the signup flow — credential stuffing is
  // the primary brute-force threat for an email/password login. Turnstile
  // makes that orders of magnitude more expensive without inconveniencing
  // real users (most pass invisibly, the rest see a one-click challenge).
  const turnstileToken = formData.get('cf-turnstile-response') as string | null
  const captcha = await verifyTurnstileToken(turnstileToken, await getClientIp())
  if (!captcha.ok) {
    return { ok: false, error: captcha.error, status: 400 }
  }

  const supabase = await createServerClient()
  const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { ok: false, error: 'Invalid email or password. Please try again.', status: 401 }
  }

  // Login alert: log this sign-in, and if it's a new device, email the user.
  // We await this (typically <600ms total) instead of fire-and-forget because
  // serverless functions can drop in-flight promises once the response is
  // sent — so a void call would silently lose the email on cold starts.
  // recordAndAlertLogin swallows its own errors so a flaky DB or email
  // service never blocks the sign-in.
  try {
    const u = signInData.user
    if (u) {
      const h = await headers()
      const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim()
            ?? h.get('x-real-ip')
            ?? h.get('cf-connecting-ip')
            ?? null
      const ua = h.get('user-agent') ?? null
      await recordAndAlertLogin({
        userId:   u.id,
        email:    u.email ?? email,
        name:     (u.user_metadata?.full_name as string | undefined) ?? null,
        ip,
        userAgent: ua,
      })
    }
  } catch (err) {
    console.error('[login] login-alert wiring failed:', err)
  }

  return { ok: true, redirectTo: next }
}
