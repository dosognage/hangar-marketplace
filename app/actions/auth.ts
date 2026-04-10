'use server'

/**
 * Auth Server Actions
 *
 * These run on the server, so they can safely read/write cookies and
 * call Supabase without exposing secrets to the browser.
 *
 * login / signup return an error string on failure, or redirect on success.
 * logout signs the user out and redirects to the homepage.
 */

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { sendEmail, welcomeEmail } from '@/lib/email'

export type AuthState = { error: string; email?: string; name?: string } | null

// ── Login ──────────────────────────────────────────────────────────────────

export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string
  const next = (formData.get('next') as string) || '/'

  if (!email || !password) {
    return { error: 'Email and password are required.', email }
  }

  const supabase = await createServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Invalid email or password. Please try again.', email }
  }

  redirect(next)
}

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
  const next = (formData.get('next') as string) || '/'

  if (!name || !email || !password) {
    return { error: 'All fields are required.', name, email }
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.', name, email }
  }
  if (password !== confirm) {
    return { error: 'Passwords do not match.', name, email }
  }

  const supabase = await createServerClient()
  const { error } = await supabase.auth.signUp({
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

// ── Logout ─────────────────────────────────────────────────────────────────

export async function logout() {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect('/')
}
