import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/airports/runways?code=KPAE
 *
 * Returns the primary (longest) runway info for a given airport code.
 * First tries AviationAPI (free, no auth), falls back gracefully.
 *
 * Response shape:
 *   { runway_length_ft: number|null, runway_width_ft: number|null, runway_surface: string|null }
 */

type AviationAPIRunway = {
  length: number | null
  width: number | null
  material: string | null
}

type AviationAPIAirport = {
  runways?: AviationAPIRunway[]
}

type AviationAPIResponse = Record<string, AviationAPIAirport>

// Map AviationAPI material codes → readable surface names
const SURFACE_MAP: Record<string, string> = {
  'ASPH':       'Asphalt',
  'ASPH-F':     'Asphalt',
  'ASPH-G':     'Asphalt',
  'ASPH-GRVL':  'Asphalt/Gravel',
  'ASPH-GROOVET': 'Asphalt (grooved)',
  'ASPH-CONC':  'Asphalt/Concrete',
  'CONC':       'Concrete',
  'CONC-G':     'Concrete',
  'CONC-F':     'Concrete',
  'CONC-GRVL':  'Concrete/Gravel',
  'TURF':       'Turf/Grass',
  'TURF-G':     'Turf/Grass',
  'TURF-F':     'Turf/Grass',
  'TURF-GRVL':  'Turf/Gravel',
  'GRVL':       'Gravel',
  'GRVL-G':     'Gravel',
  'DIRT':       'Dirt',
  'DIRT-G':     'Dirt',
  'MATS':       'PSP/Mats',
  'WATER':      'Water',
  'SAND':       'Sand',
}

function normalizeSurface(raw: string | null): string | null {
  if (!raw) return null
  const upper = raw.toUpperCase().trim()
  // Try exact match first
  if (SURFACE_MAP[upper]) return SURFACE_MAP[upper]
  // Try prefix match (e.g. "ASPH-CONC-GRVL" → "Asphalt")
  for (const [key, label] of Object.entries(SURFACE_MAP)) {
    if (upper.startsWith(key)) return label
  }
  // Return title-cased raw value as fallback
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
}

export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get('code') ?? '').trim().toUpperCase()
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })

  // Try AviationAPI (free, no auth required)
  // Accepts both ICAO (KPAE) and FAA (PAE) identifiers
  try {
    const res = await fetch(
      `https://api.aviationapi.com/v1/airports?apt=${encodeURIComponent(code)}`,
      { next: { revalidate: 86400 } }  // cache 24h
    )

    if (res.ok) {
      const data = await res.json() as AviationAPIResponse
      // AviationAPI returns the airport keyed by its identifier
      const airport = data[code] ?? Object.values(data)[0]
      const runways = airport?.runways ?? []

      if (runways.length > 0) {
        // Pick the longest runway
        const primary = [...runways].sort((a, b) => (b.length ?? 0) - (a.length ?? 0))[0]
        return NextResponse.json({
          runway_length_ft: primary.length ?? null,
          runway_width_ft:  primary.width  ?? null,
          runway_surface:   normalizeSurface(primary.material),
          source: 'aviationapi',
        })
      }
    }
  } catch {
    // Fall through to DB lookup
  }

  // Fallback: check our own airports table elevation as a proxy indicator
  // (we don't store runway data, so return nulls — user fills in manually)
  const { data: airport } = await supabaseAdmin
    .from('airports')
    .select('ident, type')
    .eq('ident', code)
    .maybeSingle()

  if (!airport) {
    return NextResponse.json({ runway_length_ft: null, runway_width_ft: null, runway_surface: null, source: 'none' })
  }

  return NextResponse.json({
    runway_length_ft: null,
    runway_width_ft:  null,
    runway_surface:   null,
    source: 'none',
  })
}
