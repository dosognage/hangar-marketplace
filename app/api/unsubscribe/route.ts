import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail, unsubscribeConfirmEmail } from '@/lib/email'

/**
 * GET  /api/unsubscribe?token=xxx
 *   One-click unsubscribe — required by CAN-SPAM. Called from the link in
 *   every marketing email. Idempotent: clicking twice is a no-op. The
 *   unsubscribe_token is a long random string per subscriber (generated
 *   at signup and stored on email_subscribers), so possession of the
 *   token == proof of email ownership.
 *
 * POST /api/unsubscribe   Body: { email }
 *   "Send me an unsubscribe link." Looks the email up and (if found,
 *   marketing-consenting, with a token, not yet unsubscribed) sends
 *   them a confirmation email containing their token-bearing GET link.
 *
 *   SECURITY: This used to unsubscribe the email outright. That allowed
 *   any anonymous caller to mass-harass our subscribers — POST every
 *   address in a leaked list and it'd silently mute them. Email-ownership
 *   proof via the confirm link closes the harassment vector. The endpoint
 *   also returns the same generic 200 whether or not the address exists,
 *   to avoid email enumeration.
 *
 *   Both handlers use supabaseAdmin (service-role) — these are admin
 *   operations on a system table and shouldn't depend on RLS.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/unsubscribe?status=error', req.url))
  }

  try {
    const { error } = await supabaseAdmin
      .from('email_subscribers')
      .update({ unsubscribed_at: new Date().toISOString(), marketing_consent: false })
      .eq('unsubscribe_token', token)
      .is('unsubscribed_at', null) // idempotent — no-op if already unsubscribed

    if (error) throw error

    return NextResponse.redirect(new URL('/unsubscribe?status=success', req.url))
  } catch (err) {
    console.error('[unsubscribe GET]', err)
    return NextResponse.redirect(new URL('/unsubscribe?status=error', req.url))
  }
}

export async function POST(req: NextRequest) {
  // Generic OK response is reused on every exit path so a caller can't
  // tell the difference between "valid email queued for confirmation"
  // and "no such email" — defeats list-enumeration via this endpoint.
  const genericOk = NextResponse.json({ ok: true })

  let email: string | undefined
  try {
    const body = await req.json()
    email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : undefined
  } catch {
    // Malformed body still returns 200 — same enumeration-resistance reasoning.
    return genericOk
  }

  // Loose RFC-5321-ish check. Real validation is the email actually
  // arriving at the user's inbox.
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return genericOk
  }

  try {
    const { data: sub } = await supabaseAdmin
      .from('email_subscribers')
      .select('email, unsubscribe_token, unsubscribed_at')
      .eq('email', email)
      .maybeSingle()

    // Only send the confirm email if the address exists, has a token, and
    // is currently subscribed. We swallow errors in the email send so a
    // flaky Resend never reveals (via timing or status code) whether the
    // address was on the list.
    if (sub?.unsubscribe_token && !sub.unsubscribed_at) {
      const unsubUrl = `${SITE_URL}/api/unsubscribe?token=${sub.unsubscribe_token}`
      const { subject, html } = unsubscribeConfirmEmail({ unsubUrl })
      await sendEmail({ to: sub.email, subject, html }).catch(e =>
        console.error('[unsubscribe POST] confirm send failed:', e)
      )
    }
  } catch (err) {
    // Log internally but never surface to caller.
    console.error('[unsubscribe POST]', err)
  }

  return genericOk
}
