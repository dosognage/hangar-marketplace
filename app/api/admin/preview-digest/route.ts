/**
 * GET /api/admin/preview-digest
 *
 * Admin-only manual trigger for the weekly digest. Same payload as the
 * Monday cron, but invocable on demand so you can preview before the first
 * scheduled run, or re-send if a Monday's digest got lost in spam.
 *
 * Query params:
 *   ?send=1      — actually send the email (otherwise just returns JSON)
 *   ?days=14     — override the lookback window (default: 7)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { sendEmail, weeklyDigestEmail } from '@/lib/email'
import { buildDigest } from '@/lib/digest'
import { isAdminUser } from '@/lib/auth-admin'

export const dynamic = 'force-dynamic'

const DIGEST_TO = 'andre.dosogne@outlook.com'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const send = url.searchParams.get('send') === '1'
  const days = Math.max(1, Math.min(60, Number(url.searchParams.get('days') ?? 7)))

  const end   = new Date()
  const start = new Date(end.getTime() - days * 86_400_000)

  try {
    const { snapshot, priorities } = await buildDigest({ start, end })
    const { subject, html } = weeklyDigestEmail({
      rangeStart: snapshot.range.start,
      rangeEnd:   snapshot.range.end,
      snapshot,
      priorities,
    })

    if (send) {
      const result = await sendEmail({ to: DIGEST_TO, subject, html })
      if (!result.ok) {
        return NextResponse.json({ error: result.error, snapshot, priorities }, { status: 500 })
      }
      return NextResponse.json({ ok: true, sent_to: DIGEST_TO, id: result.id, snapshot, priorities })
    }

    // Dry-run mode: return the rendered HTML so admin can inspect before sending.
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
