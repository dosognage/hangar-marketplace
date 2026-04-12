import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/listings/view
 * Body: { listingId: string; sessionId?: string }
 *
 * 1. Increments the denormalized view_count on the listing (fast aggregate).
 * 2. Inserts a row in listing_views for time-series / per-device analytics.
 *
 * Called client-side on mount so bots that skip JS aren't counted.
 * Always returns 200 — tracking is non-critical, never blocks the page.
 */

function detectDevice(ua: string): 'mobile' | 'tablet' | 'desktop' {
  const u = ua.toLowerCase()
  if (/ipad|tablet|(android(?!.*mobile))/i.test(u)) return 'tablet'
  if (/mobile|iphone|ipod|android|blackberry|windows phone/i.test(u)) return 'mobile'
  return 'desktop'
}

export async function POST(req: NextRequest) {
  try {
    const body       = await req.json()
    const listingId  = body?.listingId  as string | undefined
    const sessionId  = body?.sessionId  as string | undefined
    const referrer   = body?.referrer   as string | undefined

    if (!listingId) return NextResponse.json({ ok: true })

    const ua         = req.headers.get('user-agent') ?? ''
    const deviceType = detectDevice(ua)

    // Run both writes in parallel — neither blocks the other
    await Promise.allSettled([
      supabaseAdmin.rpc('increment_view_count', { listing_id: listingId }),
      supabaseAdmin.from('listing_views').insert({
        listing_id:  listingId,
        referrer:    referrer ?? null,
        device_type: deviceType,
        session_id:  sessionId ?? null,
      }),
    ])
  } catch {
    // Silently ignore — view tracking is best-effort
  }
  return NextResponse.json({ ok: true })
}
