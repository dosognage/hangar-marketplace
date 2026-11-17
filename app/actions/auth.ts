'use server'

/**
 * Auth Server Actions
 *
 * These run on the server, so they can safely read/write cookies and
 * call Supabase without exposing secrets to the browser.
 *
 * signup returns an error string on failure, or redirects on success.
 * Login lives in POST /api/auth/login (lib/password-login.ts), not here:
 * see that file for why it is not a Server Action.
 * logout signs the user out and redirects to the homepage.
 */

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { sendEmail, welcomeEmail } from '@/lib/email'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { getClientIp } from '@/lib/password-login'
import { safeNextPath } from '@/lib/safe-redirect'

export type AuthState = { error: string; email?: string; name?: string } | null

// ── Sign Up ────────────────────────────────────────────────────────────────

export async function signup(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string
  const confirm = formData.get('confirmPassword') as string
  const marketingConsent = formData.get('marketingConsent') === 'on'
  // Same hardening as login — see lib/safe-redirect.ts.
  const next = safeNextPath(formData.get('next') as string | null)

  if (!name || !email || !password) {
    return { error: 'All fields are required.', name, email }
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.', name, email }
  }
  if (password !== confirm) {
    return { error: 'Passwords do not match.', name, email }
  }

  // Bot-protection gate. Cheap to verify and stops scripted account creation
  // from getting anywhere near Supabase. Real users either pass invisibly or
  // see a one-click challenge.
  const turnstileToken = formData.get('cf-turnstile-response') as string | null
  const captcha = await verifyTurnstileToken(turnstileToken, await getClientIp())
  if (!captcha.ok) {
    return { error: captcha.error, name, email }
  }

  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  })

  if (error) {
    // Surface a friendlier message for the most common case
    if (error.message.toLowerCase().includes('already registered')) {
      return { error: 'That email is already registered. Try logging in instead.', name, email }
    }
    return { error: error.message, name, email }
  }

  // An address that already has a confirmed account does NOT come back as
  // an error, so the branch above never catches it. Supabase answers with
  // a decoy user carrying an empty `identities` array and sends no email,
  // which is deliberate anti-enumeration. Left unhandled, the caller
  // reports success, we send a welcome email to someone who already has
  // an account, and they're never actually signed in.
  //
  // Not a leak: the empty-identities response is already returned to any
  // direct caller of the API.
  if (data.user?.identities?.length === 0) {
    return { error: 'That email is already registered. Try logging in instead.', name, email }
  }

  // Send welcome email (fire-and-forget, non-fatal)
  try {
    const { subject, html } = welcomeEmail(name)
    await sendEmail({ to: email, subject, html })
  } catch (emailErr) {
    console.error('[signup] Welcome email failed:', emailErr)
  }

  // If user opted into marketing emails, record their consent
  if (marketingConsent) {
    try {
      const supabaseAdmin = (await import('@/lib/supabase-admin')).supabaseAdmin
      await supabaseAdmin.from('email_subscribers').upsert(
        {
          email: email.toLowerCase(),
          marketing_consent: true,
          consent_timestamp: new Date().toISOString(),
          consent_source: 'signup_form',
          unsubscribed_at: null,
        },
        { onConflict: 'email' }
      )
    } catch (subErr) {
      console.error('[signup] Marketing consent save failed:', subErr)
    }
  }

  // Supabase may require email confirmation depending on project settings.
  // Pass next through so after confirming they land back where they came from.
  const confirmUrl = next && next !== '/' ? `/signup/confirm?next=${encodeURIComponent(next)}` : '/signup/confirm'
  redirect(confirmUrl)
}

// ── Forgot Password ────────────────────────────────────────────────────────

export type ForgotPasswordState = { error?: string; sent?: boolean; email?: string } | null

/**
 * Sends a password-reset email via Supabase, gated by Turnstile so bots can't
 * use this endpoint to harvest valid emails or spam mailboxes.
 *
 * We always return the same generic success message regardless of whether the
 * email exists, to avoid email enumeration. The actual reset email only goes
 * out if the address is registered.
 */
export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = (formData.get('email') as string)?.trim()
  if (!email) return { error: 'Email is required.', email }

  const turnstileToken = formData.get('cf-turnstile-response') as string | null
  const captcha = await verifyTurnstileToken(turnstileToken, await getClientIp())
  if (!captcha.ok) return { error: captcha.error, email }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'
  const supabase = await createServerClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/reset-password`,
  })

  // Don't surface specific errors to the user — same generic outcome whether
  // the address is registered or not. Real errors are logged for us.
  if (error) {
    console.error('[forgot-password] Supabase error:', error)
  }

  return { sent: true, email }
}

// ── Logout ─────────────────────────────────────────────────────────────────

export async function logout() {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect('/')
}
