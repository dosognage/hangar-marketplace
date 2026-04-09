/**
 * GET /api/cron/sponsorship-expiry
 *
 * Daily cron job that finds listings whose sponsorship expires within the
 * next 3 days and sends a renewal reminder email to the owner.
 *
 * Triggered by Vercel Cron (see vercel.json). Protected by CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail, sponsorshipExpiryEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const in3Days = new Date(now.getTime() + 3 * 86_400_000)

  // Find listings expiring within the next 3 days that haven't been notified yet
  // We use a window of "now to +3 days" to catch only listings with ~3 days remaining
  const { data: listings, error } = await supabaseAdmin
    .from('listings')
    .select('id, title, contact_name, contact_email, sponsored_until')
    .eq('is_sponsored', true)
    .gte('sponsored_until', now.toISOString())
    .lte('sponsored_until', in3Days.toISOString())

  if (error) {
    console.error('[cron/sponsorship-expiry] DB error:', error.message)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!listings || listings.length === 0) {
    console.log('[cron/sponsorship-expiry] No listings expiring soon')
    return NextResponse.json({ sent: 0 })
  }

  let sent = 0
  let failed = 0

  for (const listing of listings) {
    const { subject, html } = sponsorshipExpiryEmail({
      ownerName:    listing.contact_name,
      listingTitle: listing.title,
      listingId:    listing.id,
      expiresAt:    listing.sponsored_until,
    })

    try {
      await sendEmail({ to: listing.contact_email, subject, html })
      sent++
    } catch (e) {
      console.error(`[cron/sponsorship-expiry] Failed to email ${listing.contact_email}:`, e)
      failed++
    }
  }

  console.log(`[cron/sponsorship-expiry] Sent ${sent} renewal reminders, ${failed} failed`)
  return NextResponse.json({ sent, failed })
}
