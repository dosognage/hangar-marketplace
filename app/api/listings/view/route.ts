import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/listings/view
 * Body: { listingId: string }
 *
 * Atomically increments view_count via a Postgres function.
 * Called client-side on mount so bots that don't run JS aren't counted.
 * Always returns 200 — view tracking is non-critical.
 */
export async function POST(req: NextRequest) {
  try {
    const { listingId } = await req.json()
    if (!listingId) return NextResponse.json({ ok: true })

    await supabase.rpc('increment_view_count', { listing_id: listingId })
  } catch {
    // Silently ignore — view count is best-effort
  }
  return NextResponse.json({ ok: true })
}
