import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

/**
 * GET  /api/unsubscribe?token=xxx
 *   One-click unsubscribe — required by CAN-SPAM and GDPR.
 *   Called from the link in every marketing email.
 *   Redirects to /unsubscribe?status=success|error for a clean UX.
 *
 * POST /api/unsubscribe
 *   Programmatic unsubscribe with { email } body, used from the
 *   /unsubscribe page's manual form.
 */

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/unsubscribe?status=error', req.url))
  }

  try {
    const supabase = await createServerClient()

    const { error } = await supabase
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
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email required.' }, { status: 400 })

    const supabase = await createServerClient()

    const { error } = await supabase
      .from('email_subscribers')
      .update({ unsubscribed_at: new Date().toISOString(), marketing_consent: false })
      .eq('email', email.toLowerCase().trim())

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[unsubscribe POST]', err)
    return NextResponse.json({ error: 'Could not process unsubscribe.' }, { status: 500 })
  }
}
