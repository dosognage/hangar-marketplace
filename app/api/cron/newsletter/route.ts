import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, newsletterEmail } from '@/lib/email'

/**
 * Monthly newsletter cron
 *
 * Triggered automatically on the 1st of every month at 10:00 AM UTC
 * by Vercel Cron (see vercel.json).
 *
 * Security: Vercel passes the CRON_SECRET as a Bearer token.
 * Set CRON_SECRET in your Vercel environment variables.
 *
 * The newsletter includes:
 *  - Up to 6 listings approved in the past 30 days
 *  - Personalised unsubscribe link for each recipient
 */

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getSupabase()
    const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'

    // ── Fetch active subscribers ───────────────────────────────────────────
    const { data: subscribers, error: subError } = await supabase
      .from('email_subscribers')
      .select('email, unsubscribe_token')
      .eq('marketing_consent', true)
      .is('unsubscribed_at', null)

    if (subError) throw subError
    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No active subscribers.' })
    }

    // ── Fetch recent listings (approved in last 30 days) ──────────────────
    // Bug fix: there's no `price` column on listings — sale uses asking_price,
    // lease uses monthly_lease. Pull both and compute a unified `price`
    // before passing to the email template.
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: rawListings } = await supabase
      .from('listings')
      .select('id, title, airport_name, airport_code, listing_type, asking_price, monthly_lease, view_count, is_sponsored')
      .eq('status', 'approved')
      .eq('is_sample', false)
      .gte('created_at', thirtyDaysAgo)
      .order('is_sponsored', { ascending: false })  // sponsored listings first
      .order('view_count', { ascending: false })    // then most-viewed
      .order('created_at', { ascending: false })    // then newest
      .limit(6)

    // Normalise to the shape newsletterEmail() expects: a single `price` field.
    // Sale listings → asking_price; lease listings → monthly_lease.
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

    // ── Send to each subscriber with their own unsubscribe token ──────────
    let sent = 0
    const errors: string[] = []

    for (const sub of subscribers) {
      const unsubUrl = `${siteUrl}/api/unsubscribe?token=${sub.unsubscribe_token}`
      const { subject, html } = newsletterEmail({
        unsubUrl,
        recentListings: recentListings ?? [],
        month,
        year,
      })

      try {
        await sendEmail({ to: sub.email, subject, html })
        sent++
      } catch (e) {
        errors.push(`${sub.email}: ${String(e)}`)
      }
    }

    console.log(`[newsletter cron] sent=${sent} errors=${errors.length}`)
    return NextResponse.json({ sent, errors: errors.length, detail: errors })
  } catch (err: unknown) {
    console.error('[newsletter cron]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
