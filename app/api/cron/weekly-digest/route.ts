/**
 * GET /api/cron/weekly-digest
 *
 * Vercel Cron job — runs every Monday at 13:00 UTC (~9am Eastern, ~6am
 * Pacific). Builds a snapshot of last week's marketplace activity, derives
 * 3 suggested priorities, and emails the digest to the admin.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. We reject
 * any request that doesn't match.
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, weeklyDigestEmail } from '@/lib/email'
import { buildDigest } from '@/lib/digest'

// Force dynamic — never pre-render. We need to query Supabase fresh every run.
export const dynamic = 'force-dynamic'

// The recipient. Currently a single admin inbox; if we ever onboard a team,
// switch this to ADMIN_EMAILS.split(',') and loop.
const DIGEST_TO = 'andre.dosogne@outlook.com'

export async function GET(req: NextRequest) {
  // Cron auth gate — same pattern used by sponsorship-expiry / saved-searches.
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { snapshot, priorities } = await buildDigest()

    const { subject, html } = weeklyDigestEmail({
      rangeStart: snapshot.range.start,
      rangeEnd:   snapshot.range.end,
      snapshot,
      priorities,
    })

    const result = await sendEmail({ to: DIGEST_TO, subject, html })
    if (!result.ok) {
      console.error('[cron/weekly-digest] sendEmail failed:', result.error)
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    console.log('[cron/weekly-digest] sent ok', { id: result.id, priorities: priorities.length })
    return NextResponse.json({
      ok: true,
      sent_to: DIGEST_TO,
      priorities_count: priorities.length,
      snapshot,
    })
  } catch (err) {
    console.error('[cron/weekly-digest] failed:', err)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
