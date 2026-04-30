/**
 * GET /api/cron/market-scan
 *
 * Vercel Cron — runs every Monday at 14:00 UTC (~10am Eastern, ~7am Pacific),
 * 1 hour after the activity digest. Pulls aviation real estate signals from
 * curated free RSS feeds, formats as a digest email, sends to admin.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail, marketScanEmail } from '@/lib/email'
import { buildMarketScan } from '@/lib/marketScan'

export const dynamic = 'force-dynamic'

// Always send to admin, plus any broker who opted in during setup.
const ADMIN_TO = 'andre.dosogne@outlook.com'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const signals = await buildMarketScan(12)
    const end   = new Date()
    const start = new Date(end.getTime() - 7 * 86_400_000)

    const { subject, html } = marketScanEmail({
      rangeStart: start,
      rangeEnd:   end,
      signals,
    })

    // Fan out to admin + opted-in brokers. Brokers' rows are tagged with
    // consent_source='broker_setup'. Only send to those who haven't
    // unsubscribed (unsubscribed_at IS NULL) and who explicitly consented.
    const { data: brokerSubs } = await supabaseAdmin
      .from('email_subscribers')
      .select('email')
      .eq('consent_source', 'broker_setup')
      .eq('marketing_consent', true)
      .is('unsubscribed_at', null)

    const recipients = new Set<string>([ADMIN_TO])
    for (const s of (brokerSubs ?? [])) {
      if (s.email) recipients.add(s.email)
    }

    let sent = 0
    const failures: string[] = []
    for (const to of recipients) {
      const r = await sendEmail({ to, subject, html })
      if (r.ok) sent++
      else failures.push(`${to}: ${r.error}`)
    }

    console.log('[cron/market-scan] complete', { sent, failed: failures.length, signals: signals.length })
    return NextResponse.json({
      ok:             failures.length === 0,
      sent,
      failed:         failures.length,
      signals_count:  signals.length,
      recipients:     Array.from(recipients).length,
      failures,
    })
  } catch (err) {
    console.error('[cron/market-scan] failed:', err)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
