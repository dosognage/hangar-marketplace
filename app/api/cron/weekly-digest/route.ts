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
import { adminEmailList } from '@/lib/auth-admin'

// Force dynamic — never pre-render. We need to query Supabase fresh every run.
export const dynamic = 'force-dynamic'

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

    // L1: send to every admin in ADMIN_EMAILS rather than a hardcoded
    // inbox. Each admin gets their own copy so we don't single-point-of-fail
    // when the original recipient is on vacation.
    const recipients = adminEmailList()
    if (recipients.length === 0) {
      console.warn('[cron/weekly-digest] ADMIN_EMAILS is empty — no recipients')
      return NextResponse.json({ ok: false, sent_to: [] }, { status: 500 })
    }

    const sendResults = await Promise.all(
      recipients.map(to => sendEmail({ to, subject, html })),
    )
    const failed = sendResults.filter(r => !r.ok)
    if (failed.length === recipients.length) {
      console.error('[cron/weekly-digest] all sends failed:', failed.map(f => f.error))
      return NextResponse.json({ error: 'All sends failed' }, { status: 500 })
    }

    console.log('[cron/weekly-digest] sent ok', {
      recipients: recipients.length,
      failed: failed.length,
      priorities: priorities.length,
    })
    return NextResponse.json({
      ok: true,
      sent_to: recipients,
      priorities_count: priorities.length,
      snapshot,
    })
  } catch (err) {
    console.error('[cron/weekly-digest] failed:', err)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
