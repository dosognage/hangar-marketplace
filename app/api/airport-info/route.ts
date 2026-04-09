import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/airport-info?code=KBOS
 *
 * Fetches airport metadata from the AviationWeather.gov public API.
 * No API key required. Returns tower status, airport type, and basic info
 * which we use to assess landing fee likelihood.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.toUpperCase().trim()
  if (!code) {
    return NextResponse.json({ error: 'Airport code required' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://aviationweather.gov/api/data/airport?ids=${encodeURIComponent(code)}&format=json`,
      { next: { revalidate: 3600 } } // cache for 1 hour
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Airport data unavailable' }, { status: 502 })
    }

    // API returns an array; pick the first match
    const data = await res.json()
    const airport = Array.isArray(data) ? data[0] : data

    if (!airport) {
      return NextResponse.json({ error: 'Airport not found' }, { status: 404 })
    }

    // Derive a landing fee likelihood from tower status and airport type.
    // This is a heuristic — actual fees must be verified with the airport directly.
    const hasTower  = airport.tower === 'Y' || airport.tower === true
    const isMilitary = (airport.type ?? '').toLowerCase().includes('military')
    const isCommercial = (airport.type ?? '').toLowerCase().includes('commercial')

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
  } catch {
    return NextResponse.json({ error: 'Failed to fetch airport data' }, { status: 500 })
  }
}
