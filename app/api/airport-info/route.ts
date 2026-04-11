import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/airport-info?code=S50
 *
 * Fetches airport metadata from the AviationWeather.gov public API.
 * No API key required. Returns tower status, airport type, and basic info
 * which we use to assess landing fee likelihood.
 *
 * Handles both ICAO codes (KBFI) and FAA identifiers (S50, W16, P52).
 * For FAA-only identifiers (no leading K), we try the raw code first, then
 * prepend "K" to attempt the ICAO equivalent, then fall back to a heuristic.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.toUpperCase().trim()
  if (!code) {
    return NextResponse.json({ error: 'Airport code required' }, { status: 400 })
  }

  // Build a list of codes to try in order
  const codesToTry: string[] = [code]
  // If it looks like a US FAA identifier (3 chars, or starts with letter not K),
  // also try the ICAO version with K prefix
  if (!code.startsWith('K') && code.length <= 4) {
    codesToTry.push(`K${code}`)
  }

  let airport: Record<string, unknown> | null = null

  for (const tryCode of codesToTry) {
    try {
      const res = await fetch(
        `https://aviationweather.gov/api/data/airport?ids=${encodeURIComponent(tryCode)}&format=json`,
        { next: { revalidate: 3600 } } // cache for 1 hour
      )
      if (!res.ok) continue

      const data = await res.json()
      const found = Array.isArray(data) ? data[0] : data
      if (found && (found.icaoId || found.stationId || found.name)) {
        airport = found
        break
      }
    } catch {
      // Try next code
    }
  }

  // If no match from the API, return a reasonable default for small GA airports
  // (most FAA-only identifiers are small non-towered GA fields)
  if (!airport) {
    return NextResponse.json({
      icao: code,
      name: null,
      city: null,
      state: null,
      elevation: null,
      latitude: null,
      longitude: null,
      tower: false,
      type: 'small_airport',
      feeLikelihood: 'unlikely',
      feeNote: 'This appears to be a small general aviation airport. Landing fees are uncommon at non-towered GA fields, but always confirm with the airport or FBO.',
    })
  }

  // Derive a landing fee likelihood from tower status and airport type.
  const hasTower    = airport.tower === 'Y' || airport.tower === true
  const isMilitary  = ((airport.type as string) ?? '').toLowerCase().includes('military')
  const isCommercial = ((airport.type as string) ?? '').toLowerCase().includes('commercial')

  let feeLikelihood: 'unlikely' | 'possible' | 'likely'
  let feeNote: string

  if (isMilitary) {
    feeLikelihood = 'likely'
    feeNote = 'Military airports typically charge landing fees for civilian aircraft.'
  } else if (isCommercial || hasTower) {
    feeLikelihood = 'possible'
    feeNote = hasTower
      ? 'Towered airports sometimes charge landing fees. Verify with the airport or FBO.'
      : 'Commercial airports often charge landing fees. Verify with the airport or FBO.'
  } else {
    feeLikelihood = 'unlikely'
    feeNote = 'Small non-towered GA airports typically do not charge landing fees, but it\'s worth confirming.'
  }

  return NextResponse.json({
    icao: airport.icaoId ?? airport.stationId ?? code,
    name: airport.name ?? null,
    city: airport.city ?? null,
    state: airport.state ?? null,
    elevation: airport.elev ?? null,
    latitude: airport.lat ?? null,
    longitude: airport.lon ?? null,
    tower: hasTower,
    type: airport.type ?? null,
    feeLikelihood,
    feeNote,
  })
}
