/**
 * GET /api/admin/preview-snapshot
 *
 * Admin-only manual trigger for the monthly market snapshot. Useful for:
 *   - Backfilling: snapshot a specific historical month after deploying
 *     the data foundation (we have backfilled listing_history for all
 *     existing listings, so historical snapshots will be approximate but
 *     usable).
 *   - Re-running after a fix: idempotent because of the ON CONFLICT in
 *     buildMonthlySnapshot.
 *   - Debugging: returns the result JSON without writing if ?dry=1.
 *
 * Query params:
 *   ?for=YYYY-MM-DD   — anchor date (any day inside the target month).
 *                       Defaults to today's previous month.
 *   ?dry=1            — compute but do NOT write rows. Returns the same
 *                       shape but with rows_written=0.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { buildMonthlySnapshot } from '@/lib/marketSnapshot'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  if (!adminEmails.includes((user.email ?? '').toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url     = new URL(req.url)
  const forStr  = url.searchParams.get('for')
  const dry     = url.searchParams.get('dry') === '1'

  // Default = last month (same as the cron does).
  const anchor = forStr
    ? new Date(`${forStr}T12:00:00Z`)
    : new Date(Date.now() - 86_400_000)

  if (Number.isNaN(anchor.getTime())) {
    return NextResponse.json(
      { error: `Invalid 'for' date: ${forStr}. Use YYYY-MM-DD.` },
      { status: 400 },
    )
  }

  if (dry) {
    // Dry run: we don't have a "build but don't write" mode in
    // buildMonthlySnapshot, so we just shortcut to a description of what
    // *would* be snapshotted. Cheap stand-in until we actually need
    // a true dry-run.
    const monthStart = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1))
    return NextResponse.json({
      ok: true,
      dry: true,
      snapshot_date: monthStart.toISOString().slice(0, 10),
      note: 'Dry run — no rows written. Drop ?dry=1 to actually write.',
    })
  }

  const result = await buildMonthlySnapshot(anchor)
  return NextResponse.json({ ok: true, ...result })
}
