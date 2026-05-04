/**
 * GET /api/admin/preview-market-scan
 *
 * Admin-only manual trigger / preview for the weekly market-scan digest.
 * Mirror of /api/admin/preview-digest but for the news-aggregator agent.
 *
 * Query params:
 *   ?send=1   — actually email it
 *   ?limit=N  — override max signals (default 12, max 30)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { sendEmail, marketScanEmail } from '@/lib/email'
import { buildMarketScan } from '@/lib/marketScan'
import { isAdminUser } from '@/lib/auth-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // L1: preview endpoints send to the calling admin's own inbox.
  const previewTo = user.email
  if (!previewTo) {
    return NextResponse.json({ error: 'Admin user has no email on file' }, { status: 500 })
  }

  const url = new URL(req.url)
  const send  = url.searchParams.get('send') === '1'
  const limit = Math.max(1, Math.min(30, Number(url.searchParams.get('limit') ?? 12)))

  try {
    const signals = await buildMarketScan(limit)
    const end   = new Date()
    const start = new Date(end.getTime() - 7 * 86_400_000)

    const { subject, html } = marketScanEmail({
      rangeStart: start,
      rangeEnd:   end,
      signals,
    })

    if (send) {
      const result = await sendEmail({ to: previewTo, subject, html })
      if (!result.ok) {
        return NextResponse.json({ error: result.error, signals }, { status: 500 })
      }
      return NextResponse.json({ ok: true, sent_to: previewTo, id: result.id, signals_count: signals.length })
    }

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
