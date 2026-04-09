import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/admin/regeocode
 *
 * Re-geocodes all approved listings by looking up each airport_code
 * against AviationWeather.gov and writing the correct lat/lon back
 * to the database.
 *
 * Admin-only — guarded by ADMIN_EMAILS env var.
 */
export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  if (!adminEmails.includes((user.email ?? '').toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch all listings that have an airport_code
  const { data: listings, error } = await supabaseAdmin
    .from('listings')
    .select('id, airport_code, latitude, longitude')
    .not('airport_code', 'is', null)

  if (error || !listings) {
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 })
  }

  const results: { id: string; airport_code: string; status: string; lat?: number; lon?: number }[] = []

  for (const listing of listings) {
    try {
      const res = await fetch(
        `https://aviationweather.gov/api/data/airport?ids=${encodeURIComponent(listing.airport_code)}&format=json`,
        { signal: AbortSignal.timeout(8000) }
      )
      if (!res.ok) {
        results.push({ id: listing.id, airport_code: listing.airport_code, status: 'api_error' })
        continue
      }

      const data = await res.json()
      const airport = Array.isArray(data) ? data[0] : data

      if (!airport?.lat || !airport?.lon) {
        results.push({ id: listing.id, airport_code: listing.airport_code, status: 'no_coords' })
        continue
      }

      const lat = Number(airport.lat)
      const lon = Number(airport.lon)

      // Skip if coords already match (within ~0.001 deg ≈ 100 m)
      if (
        listing.latitude != null && listing.longitude != null &&
        Math.abs(listing.latitude - lat) < 0.001 &&
        Math.abs(listing.longitude - lon) < 0.001
      ) {
        results.push({ id: listing.id, airport_code: listing.airport_code, status: 'already_correct', lat, lon })
        continue
      }

      const { error: updateError } = await supabaseAdmin
        .from('listings')
        .update({ latitude: lat, longitude: lon })
        .eq('id', listing.id)

      if (updateError) {
        results.push({ id: listing.id, airport_code: listing.airport_code, status: 'update_failed' })
      } else {
        results.push({ id: listing.id, airport_code: listing.airport_code, status: 'updated', lat, lon })
      }
    } catch {
      results.push({ id: listing.id, airport_code: listing.airport_code, status: 'timeout' })
    }

    // Small delay to avoid hammering the public API
    await new Promise(r => setTimeout(r, 150))
  }

  const updated = results.filter(r => r.status === 'updated').length
  const skipped = results.filter(r => r.status === 'already_correct').length
  const failed  = results.filter(r => !['updated', 'already_correct'].includes(r.status)).length

  return NextResponse.json({ updated, skipped, failed, results })
}
