import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/listings/event
 * Body: { listingId: string; eventType: string; metadata?: object }
 *
 * Records a user interaction against a listing for analytics:
 *   contact_click, phone_click, email_click, save, unsave,
 *   share, photo_view, map_view
 *
 * Always returns 200 — non-critical.
 */

const VALID_EVENTS = new Set([
  'contact_click',
  'phone_click',
  'email_click',
  'save',
  'unsave',
  'share',
  'photo_view',
  'map_view',
])

export async function POST(req: NextRequest) {
  try {
    const body      = await req.json()
    const listingId = body?.listingId as string | undefined
    const eventType = body?.eventType as string | undefined
    const metadata  = body?.metadata  ?? null

    if (!listingId || !eventType || !VALID_EVENTS.has(eventType)) {
      return NextResponse.json({ ok: true })
    }

    await supabaseAdmin.from('listing_events').insert({
      listing_id: listingId,
      event_type: eventType,
      metadata,
    })
  } catch {
    // Non-critical
  }
  return NextResponse.json({ ok: true })
}
