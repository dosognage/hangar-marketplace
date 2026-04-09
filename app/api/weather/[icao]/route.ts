/**
 * GET /api/weather/[icao]
 *
 * Proxies a METAR request to AviationWeather.gov and returns a minimal
 * flight-category object. Caches the response for 5 minutes via
 * Next.js fetch caching so repeated client polls don't hammer the
 * public API.
 *
 * Response:
 *   200  { icao, fltcat, temp, wind, visib, cover, obsTime }
 *   404  { error: "No METAR found" }
 *   502  { error: "…" }
 */

import { NextRequest, NextResponse } from 'next/server'

type AwgMetar = {
  icaoId:    string
  fltcat:    'VFR' | 'MVFR' | 'IFR' | 'LIFR' | null
  temp:      number | null
  wdir:      number | null
  wspd:      number | null
  visib:     string | null
  cldCvg1:   string | null
  cldBas1:   number | null
  obsTime:   string | null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ icao: string }> },
) {
  const { icao } = await params
  const code = icao.toUpperCase().slice(0, 8) // sanitise

  try {
    const url =
      `https://aviationweather.gov/api/data/metar` +
      `?ids=${encodeURIComponent(code)}&format=json&hours=2`

    // next: { revalidate: 300 } caches for 5 minutes on the server
    const res = await fetch(url, {
      next: { revalidate: 300 },
      headers: { 'User-Agent': 'HangarMarketplace/1.0' },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `AviationWeather returned ${res.status}` },
        { status: 502 },
      )
    }

    const data: AwgMetar[] = await res.json()

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'No METAR found for that airport' }, { status: 404 })
    }

    const m = data[0]

    return NextResponse.json(
      {
        icao:    m.icaoId,
        fltcat:  m.fltcat ?? 'VFR',   // default to VFR if null (station online but no category)
        temp:    m.temp,
        wind:    m.wdir != null && m.wspd != null ? `${m.wdir}@${m.wspd}` : null,
        visib:   m.visib,
        cover:   m.cldCvg1 ?? null,
        ceiling: m.cldBas1 ?? null,
        obsTime: m.obsTime,
      },
      {
        headers: {
          // Also tell the browser it can cache for 4 minutes
          'Cache-Control': 'public, s-maxage=240, stale-while-revalidate=60',
        },
      },
    )
  } catch (err: unknown) {
    console.error('[weather]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 502 },
    )
  }
}
