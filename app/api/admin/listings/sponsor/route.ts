import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyCurrentPassword } from '@/lib/reauth'
import { isAdminUser } from '@/lib/auth-admin'

/**
 * POST /api/admin/listings/sponsor
 *
 * Admin-only. Grants a free sponsorship on a listing, bypassing Stripe.
 *
 * Body: { listing_id: string, duration_days: 7 | 30 | 90 }
 *
 * Behaviour:
 *   - If the listing is already sponsored AND sponsored_until is in the future,
 *     we extend from sponsored_until (so admin comps stack cleanly).
 *   - Otherwise we start from now.
 *   - is_sponsored is flipped to true regardless.
 *   - stripe_customer_id is left untouched — it only exists for paid sponsorships
 *     and is used to surface the "Manage billing" button on the dashboard.
 */

const ALLOWED_DAYS = new Set([7, 30, 90])

async function requireAdmin(req: NextRequest) {
  void req
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return isAdminUser(user) ? user : null
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { listing_id?: string; duration_days?: number; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const listingId = body.listing_id?.toString().trim()
  const days = Number(body.duration_days)

  if (!listingId) {
    return NextResponse.json({ error: 'listing_id is required' }, { status: 400 })
  }
  if (!ALLOWED_DAYS.has(days)) {
    return NextResponse.json({ error: 'duration_days must be 7, 30, or 90' }, { status: 400 })
  }

  // Sensitive action: re-verify the admin's password before granting comp.
  // This is "spending" platform revenue, so we want a real-time auth check
  // even though the admin-email gate already passed.
  const reauth = await verifyCurrentPassword(body.password)
  if (!reauth.ok) {
    return NextResponse.json({ error: reauth.error }, { status: 403 })
  }

  const { data: listing, error: fetchErr } = await supabaseAdmin
    .from('listings')
    .select('id, is_sponsored, sponsored_until')
    .eq('id', listingId)
    .single()

  if (fetchErr || !listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  // Start from the later of (now) or (current sponsored_until). This means
  // comping a 30-day sponsorship on top of an active 7-day one extends
  // coverage by 30 more days instead of shortening it.
  const now = Date.now()
  const currentUntil = listing.sponsored_until ? new Date(listing.sponsored_until).getTime() : 0
  const startFrom = Math.max(now, currentUntil)
  const newUntilIso = new Date(startFrom + days * 86_400_000).toISOString()

  const { error: updateErr } = await supabaseAdmin
    .from('listings')
    .update({
      is_sponsored:    true,
      sponsored_until: newUntilIso,
    })
    .eq('id', listingId)

  if (updateErr) {
    console.error('[admin/sponsor] update failed:', updateErr.message)
    return NextResponse.json({ error: 'Failed to grant sponsorship' }, { status: 500 })
  }

  console.log(`[admin/sponsor] ${admin.email} granted ${days}d sponsorship on ${listingId} (until ${newUntilIso})`)

  return NextResponse.json({
    success:         true,
    sponsored_until: newUntilIso,
    extended:        currentUntil > now,
  })
}
