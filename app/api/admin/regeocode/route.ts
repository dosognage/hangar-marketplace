import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { geocodeLocation } from '@/lib/geocode'

/**
 * POST /api/admin/regeocode
 *
 * Re-geocodes every approved listing by resolving its airport_code to lat/lon
 * and writing the result back. Tiered lookup so small private fields don't
 * silently fail:
 *
 *   1. Local `airports` table — fast, no rate limits, knows FAA LIDs and
 *      K-prefixed gps_codes alike.
 *   2. AviationWeather.gov — authoritative for ICAO-tagged airports.
 *   3. Nominatim — last-ditch text search.
 *
 * Admin-only — guarded by ADMIN_EMAILS.
 */

type ResultRow = {
  id:           string
  airport_code: string
  status:       'updated' | 'already_correct' | 'no_coords' | 'update_failed'
  source?:      'local' | 'aviationweather' | 'nominatim'
  lat?:         number
  lon?:         number
}

const TIMEOUT_MS = 8000
const NOMINATIM_DELAY_MS = 1100  // respect Nominatim's 1-req/sec policy

async function lookupLocal(code: string): Promise<{ lat: number; lon: number } | null> {
  // Try the user-supplied code AND the K-prefix variant for 3-char FAA LIDs,
  // matching across ident / gps_code / local_code (OurAirports stores them
  // inconsistently for small fields).
  const variants = new Set<string>([code])
  if (/^[A-Z0-9]{3}$/.test(code)) variants.add('K' + code)
  if (code.length === 4 && code.startsWith('K')) variants.add(code.slice(1))

  for (const v of variants) {
    const { data } = await supabaseAdmin
      .from('airports')
      .select('latitude_deg, longitude_deg')
      .or(`ident.eq.${v},gps_code.eq.${v},local_code.eq.${v}`)
      .limit(1)
      .maybeSingle()
    if (data?.latitude_deg != null && data?.longitude_deg != null) {
      return { lat: data.latitude_deg, lon: data.longitude_deg }
    }
  }
  return null
}

async function lookupAviationWeather(code: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://aviationweather.gov/api/data/airport?ids=${encodeURIComponent(code)}&format=json`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    )
    if (!res.ok) return null
    const data = await res.json()
    const a = Array.isArray(data) ? data[0] : data
    if (a?.lat == null || a?.lon == null) return null
    return { lat: Number(a.lat), lon: Number(a.lon) }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  if (!adminEmails.includes((user.email ?? '').toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: listings, error } = await supabaseAdmin
    .from('listings')
    .select('id, airport_code, latitude, longitude')
    .not('airport_code', 'is', null)

  if (error || !listings) {
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 })
  }

  const results: ResultRow[] = []
  let needsNominatimDelay = false

  for (const listing of listings) {
    const code = (listing.airport_code as string).trim().toUpperCase()
    if (!code) continue

    // Tier 1: local DB (free, instant)
    let coords = await lookupLocal(code)
    let source: ResultRow['source'] = coords ? 'local' : undefined

    // Tier 2: AviationWeather (authoritative, but ICAO-only)
    if (!coords) {
      coords = await lookupAviationWeather(code)
      if (coords) source = 'aviationweather'
    }

    // Tier 3: Nominatim (rate-limited; pace ourselves)
    if (!coords) {
      if (needsNominatimDelay) await new Promise(r => setTimeout(r, NOMINATIM_DELAY_MS))
      const geo = await geocodeLocation(code)
      needsNominatimDelay = true
      if (geo) {
        coords = { lat: geo.lat, lon: geo.lng }
        source = 'nominatim'
      }
    }

    if (!coords) {
      results.push({ id: listing.id, airport_code: code, status: 'no_coords' })
      continue
    }

    // Skip if coords already match (within ~0.001 deg ≈ 100 m)
    if (
      listing.latitude != null && listing.longitude != null &&
      Math.abs(listing.latitude  - coords.lat) < 0.001 &&
      Math.abs(listing.longitude - coords.lon) < 0.001
    ) {
      results.push({ id: listing.id, airport_code: code, status: 'already_correct', source, lat: coords.lat, lon: coords.lon })
      continue
    }

    const { error: updateError } = await supabaseAdmin
      .from('listings')
      .update({ latitude: coords.lat, longitude: coords.lon })
      .eq('id', listing.id)

    if (updateError) {
      results.push({ id: listing.id, airport_code: code, status: 'update_failed', source })
    } else {
      results.push({ id: listing.id, airport_code: code, status: 'updated', source, lat: coords.lat, lon: coords.lon })
    }
  }

  const updated = results.filter(r => r.status === 'updated').length
  const skipped = results.filter(r => r.status === 'already_correct').length
  const failed  = results.filter(r => r.status !== 'updated' && r.status !== 'already_correct')

  return NextResponse.json({
    updated,
    skipped,
    failed:   failed.length,
    failures: failed.map(f => ({ id: f.id, airport_code: f.airport_code, status: f.status })),
    results,
  })
}
