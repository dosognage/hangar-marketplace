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
import { sendEmail, marketScanEmail } from '@/lib/email'
import { buildMarketScan } from '@/lib/marketScan'

export const dynamic = 'force-dynamic'

const SCAN_TO = 'andre.dosogne@outlook.com'

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

    const result = await sendEmail({ to: SCAN_TO, subject, html })
    if (!result.ok) {
      console.error('[cron/market-scan] sendEmail failed:', result.error)
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    console.log('[cron/market-scan] sent ok', { id: result.id, signals: signals.length })
    return NextResponse.json({ ok: true, sent_to: SCAN_TO, signals_count: signals.length })
  } catch (err) {
    console.error('[cron/market-scan] failed:', err)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
