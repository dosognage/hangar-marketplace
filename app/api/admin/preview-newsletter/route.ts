/**
 * GET /api/admin/preview-newsletter
 *
 * Admin-only manual trigger for the monthly subscriber newsletter. Same
 * payload that goes to subscribers on the 1st of the month, but invocable
 * on demand for preview / re-send.
 *
 * Query params:
 *   ?send=1                  — actually broadcast to subscribers
 *   ?send_to=you@example.com — send only to a single address (preview to self)
 *
 * Defaults to dry-run (renders HTML in browser) so you can never accidentally
 * spam your full subscriber list while testing.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail, newsletterEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  if (!adminEmails.includes((user.email ?? '').toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const send   = url.searchParams.get('send') === '1'
  const sendTo = url.searchParams.get('send_to')?.trim() || null
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'

  // Same query as the cron job — keep these in sync.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const { data: rawListings } = await supabaseAdmin
    .from('listings')
    .select('id, title, airport_name, airport_code, listing_type, asking_price, monthly_lease, view_count, is_sponsored')
    .eq('status', 'approved')
    .eq('is_sample', false)
    .gte('created_at', thirtyDaysAgo)
    .order('is_sponsored', { ascending: false })
    .order('view_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(6)

  const recentListings = (rawListings ?? []).map(l => ({
    id:           l.id,
    title:        l.title,
    airport_name: l.airport_name,
    airport_code: l.airport_code,
    listing_type: l.listing_type,
    price:        l.listing_type === 'lease' ? l.monthly_lease : l.asking_price,
  }))

  const now   = new Date()
  const month = now.toLocaleString('en-US', { month: 'long' })
  const year  = now.getFullYear()

  // ── Single-address preview path (most common when testing) ─────────────
  if (sendTo) {
    const unsubUrl = `${siteUrl}/api/unsubscribe?token=preview`
    const { subject, html } = newsletterEmail({ unsubUrl, recentListings, month, year })
    if (send) {
      const result = await sendEmail({ to: sendTo, subject, html })
      return NextResponse.json({ ok: result.ok, sent_to: sendTo, error: result.error })
    }
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // ── Full subscriber broadcast (only with explicit ?send=1 and no send_to) ─
  if (send) {
    const { data: subscribers } = await supabaseAdmin
      .from('email_subscribers')
      .select('email, unsubscribe_token')
      .eq('marketing_consent', true)
      .is('unsubscribed_at', null)

    let sent = 0
    const failures: string[] = []
    for (const sub of subscribers ?? []) {
      const unsubUrl = `${siteUrl}/api/unsubscribe?token=${sub.unsubscribe_token}`
      const { subject, html } = newsletterEmail({ unsubUrl, recentListings, month, year })
      try {
        const r = await sendEmail({ to: sub.email, subject, html })
        if (r.ok) sent++
        else failures.push(`${sub.email}: ${r.error}`)
      } catch (e) {
        failures.push(`${sub.email}: ${String(e)}`)
      }
    }
    return NextResponse.json({ ok: true, sent, failures: failures.length, detail: failures })
  }

  // ── Dry run: render to browser ─────────────────────────────────────────
  const previewUnsub = `${siteUrl}/api/unsubscribe?token=preview`
  const { html } = newsletterEmail({ unsubUrl: previewUnsub, recentListings, month, year })
  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
