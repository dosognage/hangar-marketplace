/**
 * GET /api/cron/facebook-post
 *
 * Vercel Cron, weekdays at 17:00 UTC (9 or 10 AM Pacific). Publishes one
 * approved listing to the Hangar Marketplace Facebook Page and emails the
 * admins the post link. Does nothing until FACEBOOK_PAGE_ID and
 * FACEBOOK_PAGE_ACCESS_TOKEN are set.
 *
 * ?dry=1 returns the listing and caption the next run would post, without
 * posting or writing anything.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { runFacebookAutopost } from '@/lib/facebookAutopost'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = req.nextUrl.searchParams.get('dry') === '1'
  try {
    const result = await runFacebookAutopost({ dryRun })
    if (result.status === 'failed') console.error('[cron/facebook-post] failed:', result.error)
    else console.log('[cron/facebook-post]', result.status)
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[cron/facebook-post] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
