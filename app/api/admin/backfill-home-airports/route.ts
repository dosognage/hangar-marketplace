import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { geocodeLocation } from '@/lib/geocode'
import { listAllAuthUsers } from '@/lib/authUsers'

/**
 * POST /api/admin/backfill-home-airports
 *
 * One-time (and idempotent) admin task to populate user_preferences with the
 * geocoded home airport coords for every user whose home airport was saved
 * BEFORE saveHomeAirport started caching coords. Without this, those users
 * don't receive 50mi nearby-listing alerts because the dispatcher reads
 * lat/lng from user_preferences, not from auth user_metadata.
 *
 * Strategy per user:
 *   1. Read user_metadata.home_airport (ICAO).
 *   2. If user_preferences already has lat/lng for this user, skip (idempotent).
 *   3. Try the local `airports` table first (no rate limits, exact ident match).
 *   4. Fall back to Nominatim with a 1.1s delay per call (Nominatim's terms).
 *   5. Upsert user_preferences with the resolved coords.
 *
 * Returns counts so the admin can see what happened.
 */

export const dynamic = 'force-dynamic'

async function requireAdmin(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  if (!adminEmails.includes((user.email ?? '').toLowerCase())) return null
  return user
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── 1. Pull every auth user via the paginating helper. Works correctly
  //    past 1000 accounts.
  let users: Array<{ id: string; user_metadata?: Record<string, unknown> }> = []
  try {
    users = await listAllAuthUsers()
  } catch (e) {
    console.error('[backfill] listAllAuthUsers failed:', e)
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
  }

  // Filter to users with a home_airport set in metadata.
  const candidates = users
    .map(u => ({
      user_id:           u.id,
      home_airport_code: typeof u.user_metadata?.home_airport === 'string'
                            ? (u.user_metadata.home_airport as string).trim().toUpperCase()
                            : '',
    }))
    .filter(u => u.home_airport_code.length >= 3)

  if (candidates.length === 0) {
    return NextResponse.json({
      total_users:      users.length,
      with_home_airport: 0,
      already_geocoded: 0,
      backfilled:       0,
      failed:           0,
      detail:           'No users have a home airport set yet.',
    })
  }

  // ── 2. Bulk-fetch existing user_preferences rows so we can skip ones ──
  //    that already have lat/lng (idempotent). One round-trip vs N.
  const candidateIds = candidates.map(c => c.user_id)
  const { data: existingPrefs } = await supabaseAdmin
    .from('user_preferences')
    .select('user_id, home_airport_lat, home_airport_lng')
    .in('user_id', candidateIds)

  const existingByUser = new Map<string, { lat: number | null; lng: number | null }>()
  for (const row of existingPrefs ?? []) {
    existingByUser.set(row.user_id, { lat: row.home_airport_lat, lng: row.home_airport_lng })
  }

  // ── 3. For each candidate that needs geocoding, resolve coords ────────
  let alreadyGeocoded = 0
  let backfilled = 0
  let failed = 0
  const failures: Array<{ user_id: string; code: string; reason: string }> = []

  for (const cand of candidates) {
    const existing = existingByUser.get(cand.user_id)
    if (existing && existing.lat != null && existing.lng != null) {
      alreadyGeocoded++
      continue
    }

    // 3a. Try the local airports table — fast, no rate limits.
    let lat: number | null = null
    let lng: number | null = null

    const { data: airportRow } = await supabaseAdmin
      .from('airports')
      .select('latitude_deg, longitude_deg')
      .eq('ident', cand.home_airport_code)
      .maybeSingle()

    if (airportRow?.latitude_deg != null && airportRow?.longitude_deg != null) {
      lat = airportRow.latitude_deg
      lng = airportRow.longitude_deg
    } else {
      // 3b. Fallback to Nominatim — must respect their rate limit (1 req/s).
      // Sleep BEFORE the call so the first call has a beat too.
      await sleep(1100)
      const geo = await geocodeLocation(cand.home_airport_code)
      if (geo) {
        lat = geo.lat
        lng = geo.lng
      }
    }

    if (lat == null || lng == null) {
      failed++
      failures.push({ user_id: cand.user_id, code: cand.home_airport_code, reason: 'No coords found' })
      continue
    }

    const { error: upsertErr } = await supabaseAdmin
      .from('user_preferences')
      .upsert({
        user_id:           cand.user_id,
        home_airport_code: cand.home_airport_code,
        home_airport_lat:  lat,
        home_airport_lng:  lng,
        updated_at:        new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (upsertErr) {
      failed++
      failures.push({ user_id: cand.user_id, code: cand.home_airport_code, reason: upsertErr.message })
      continue
    }

    backfilled++
  }

  console.log(`[backfill] ${admin.email} ran home-airport backfill: ${backfilled} backfilled, ${alreadyGeocoded} already had coords, ${failed} failed`)

  return NextResponse.json({
    total_users:        users.length,
    with_home_airport:  candidates.length,
    already_geocoded:   alreadyGeocoded,
    backfilled,
    failed,
    failures:           failures.slice(0, 20), // cap response payload
  })
}
