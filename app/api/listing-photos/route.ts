/**
 * /api/listing-photos
 *
 * Server-side photo record management — uses supabaseAdmin to bypass RLS.
 * All write operations are auth-gated: the calling user must own the listing
 * (user_id match) OR be a broker assigned to it (broker_profile_id match).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { canEditListing } from '@/lib/listing-access'

async function getAuthedUser(req: NextRequest) {
  // req is unused here — createServerClient reads cookies from the request context
  void req
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// canEditListing moved to lib/listing-access.ts so upload-url shares
// the same authorization definition (audit SEC-10).

// ── POST: insert photo records after a successful storage upload ─────────────
export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { listing_id, photos } = body as {
    listing_id: string
    photos: { storage_path: string; display_order: number }[]
  }

  if (!listing_id || !Array.isArray(photos) || photos.length === 0) {
    return NextResponse.json({ error: 'Missing listing_id or photos' }, { status: 400 })
  }

  if (!(await canEditListing(user.id, listing_id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Tier cap: refuse if this upload would push the listing over the
  // host's per-listing photo limit (Free=5, Featured=15, Pro=unlimited).
  // Surfaces a user-facing reason so the upgrade prompt is obvious.
  const { canAddPhotos } = await import('@/lib/host-tier')
  const cap = await canAddPhotos(user.id, listing_id, photos.length)
  if (!cap.ok) {
    return NextResponse.json(
      { error: cap.reason, tier: cap.tier, limit: cap.limit, existing: cap.existing },
      { status: 403 },
    )
  }

  const records = photos.map(p => ({
    listing_id,
    storage_path: p.storage_path,
    display_order: p.display_order,
  }))

  const { data, error } = await supabaseAdmin
    .from('listing_photos')
    .insert(records)
    .select('id, storage_path, display_order')

  if (error) {
    console.error('[listing-photos POST]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ photos: data })
}

// ── DELETE: remove a photo from storage + DB ─────────────────────────────────
export async function DELETE(req: NextRequest) {
  const user = await getAuthedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { photo_id, listing_id, storage_path } = await req.json()

  if (!photo_id || !listing_id) {
    return NextResponse.json({ error: 'Missing photo_id or listing_id' }, { status: 400 })
  }

  if (!(await canEditListing(user.id, listing_id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // SECURITY (audit SEC-11): the caller proved they can edit
  // `listing_id`, but photo_id and storage_path used to be trusted
  // as-is, letting one listing owner delete photos across every other
  // listing. Both are now pinned to the authorized listing.
  if (storage_path && !String(storage_path).startsWith(`${listing_id}/`)) {
    return NextResponse.json({ error: 'storage_path does not belong to this listing' }, { status: 403 })
  }

  const { data: deleted, error } = await supabaseAdmin
    .from('listing_photos')
    .delete()
    .eq('id', photo_id)
    .eq('listing_id', listing_id)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!deleted?.length) {
    return NextResponse.json({ error: 'Photo not found on this listing' }, { status: 404 })
  }

  // Remove from storage (best-effort) only after the row proved to
  // belong to this listing.
  if (storage_path) {
    const { error: storErr } = await supabaseAdmin.storage
      .from('listing-photos')
      .remove([storage_path])
    if (storErr) console.warn('[listing-photos DELETE] storage remove failed:', storErr.message)
  }

  return NextResponse.json({ success: true })
}

// ── PATCH: update display_order for multiple photos ───────────────────────────
export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { listing_id, updates } = await req.json() as {
    listing_id: string
    updates: { id: string; display_order: number }[]
  }

  if (!listing_id || !Array.isArray(updates)) {
    return NextResponse.json({ error: 'Missing listing_id or updates' }, { status: 400 })
  }

  if (!(await canEditListing(user.id, listing_id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // SECURITY (audit SEC-11): pin every reorder to the authorized
  // listing so foreign photo ids are inert.
  await Promise.all(
    updates.map(u =>
      supabaseAdmin.from('listing_photos')
        .update({ display_order: u.display_order })
        .eq('id', u.id)
        .eq('listing_id', listing_id)
    )
  )

  return NextResponse.json({ success: true })
}
