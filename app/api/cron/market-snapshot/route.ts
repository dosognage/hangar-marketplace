/**
 * Monthly market snapshot cron
 *
 * Runs at 02:00 UTC on the 1st of every month. Computes per-(airport,
 * property_type, listing_type) aggregates for the *previous* month and
 * upserts them into market_snapshots.
 *
 * Why the previous month?
 *   - The 1st-of-month run is the natural close-out for the month that
 *     just ended. If we ran for the *current* month, we'd be snapshotting
 *     a 1-second-old window with no data.
 *
 * Security: Vercel passes CRON_SECRET as a Bearer token. Same pattern
 * as the other cron endpoints.
 */

import { NextRequest, NextResponse } from 'next/server'
import { buildMonthlySnapshot } from '@/lib/marketSnapshot'

export const dynamic = 'force-dynamic'
// Snapshot computation can take 30–60s with full inventory + history scans.
// Bump the function timeout above the default 10s.
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Snapshot the month that just ended. Today is the 1st (or close to it),
    // so subtracting a day gives us a date inside the previous month.
    const now = new Date()
    const previousMonthAnchor = new Date(now.getTime() - 86_400_000)

    const result = await buildMonthlySnapshot(previousMonthAnchor)
    console.log(
      `[market-snapshot cron] snapshot_date=${result.snapshot_date} rows=${result.rows_written} duration_ms=${result.duration_ms}`,
    )
    return NextResponse.json({ ok: true, ...result })
  } catch (err: unknown) {
    console.error('[market-snapshot cron]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
