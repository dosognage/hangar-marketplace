import { NextRequest, NextResponse, after } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { notifyAdminsOfNewListing } from '@/lib/adminAlerts'

/**
 * POST /api/listings/announce
 * Headers: Authorization: Bearer <the lister's Supabase access token>
 * Body:    { listingId: string }
 *
 * Sends the admin "new listing" email for listings created outside the
 * website's createListing action, which today means broker listings made
 * in the iOS app. The app's manage-listing edge function calls this right
 * after its insert, forwarding the caller's own token, so no new shared
 * secret is needed.
 *
 * The claim is one conditional UPDATE: the caller must own the listing,
 * it must be less than 10 minutes old, and admin_alerted_at must still be
 * null. Anything else is a quiet no-op, so a repeat call cannot spam the
 * admin inbox.
 */

const ANNOUNCE_WINDOW_MS = 10 * 60_000

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) return NextResponse.json({ error: 'Missing token.' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Invalid session.' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const listingId = typeof body?.listingId === 'string' ? body.listingId : null
  if (!listingId) return NextResponse.json({ error: 'Missing listingId.' }, { status: 400 })

  const since = new Date(Date.now() - ANNOUNCE_WINDOW_MS).toISOString()
  const { data: claimed, error } = await supabaseAdmin
    .from('listings')
    .update({ admin_alerted_at: new Date().toISOString() })
    .eq('id', listingId)
    .eq('user_id', user.id)
    .is('admin_alerted_at', null)
    .gte('created_at', since)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[listings/announce] claim failed:', error.message)
    return NextResponse.json({ error: 'Could not announce.' }, { status: 500 })
  }
  if (!claimed) return NextResponse.json({ ok: true, announced: false })

  after(() => notifyAdminsOfNewListing(listingId))
  return NextResponse.json({ ok: true, announced: true })
}
