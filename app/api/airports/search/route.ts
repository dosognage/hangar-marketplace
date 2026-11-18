import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  AIRPORT_COLUMNS,
  broadOrFilter,
  exactCodeOrFilter,
  parseAirportQuery,
  rankAirports,
  type AirportRow,
} from '@/lib/airportSearch'

export const dynamic = 'force-dynamic'

// Cap query length so an attacker can't blow out the Postgres ILIKE
// scan with a huge pattern. 100 chars is well above any real airport
// or city name a human would type.
const MAX_QUERY_LEN = 100

// Rows fetched before ranking. The broad fetch is ordered by type (large,
// medium, seaplane, small), so the big airports are always in it; the
// ranking in lib/airportSearch.ts then decides the order that is returned.
const CANDIDATE_ROWS = 60

/**
 * GET /api/airports/search?q=...&limit=8
 *
 * Accepts codes ("KBFI", "BFI", "S36"), names ("boeing"), cities ("seat",
 * "spokane"), "City, ST" and "City, State Name", and bare states ("WA",
 * "Washington"). Best match first: exact code, then the named state, then
 * city equals / starts with, then a name word starting with the query.
 */
export async function GET(req: NextRequest) {
  const raw   = (req.nextUrl.searchParams.get('q') ?? '').trim()
  const q     = raw.slice(0, MAX_QUERY_LEN)
  const asked = parseInt(req.nextUrl.searchParams.get('limit') ?? '8', 10)
  const limit = Number.isFinite(asked) ? Math.min(Math.max(asked, 1), 20) : 8

  const query = q.length >= 2 ? parseAirportQuery(q) : null
  if (!query) {
    return NextResponse.json([])
  }

  let broad = supabaseAdmin
    .from('airports')
    .select(AIRPORT_COLUMNS)
    .or(broadOrFilter(query))
  if (query.kind === 'city_state' && query.stateCode) {
    broad = broad.eq('iso_region', `US-${query.stateCode}`)
  }

  const exactFilter = exactCodeOrFilter(query)
  const [broadRes, exactRes] = await Promise.all([
    broad.order('type').order('name').limit(CANDIDATE_ROWS),
    exactFilter
      ? supabaseAdmin.from('airports').select(AIRPORT_COLUMNS).or(exactFilter).limit(10)
      : Promise.resolve({ data: [] as AirportRow[], error: null }),
  ])

  const error = broadRes.error ?? exactRes.error
  if (error) {
    console.error('[airports/search]', error.message)
    return NextResponse.json([], { status: 500 })
  }

  const candidates = [
    ...((exactRes.data ?? []) as AirportRow[]),
    ...((broadRes.data ?? []) as AirportRow[]),
  ]
  return NextResponse.json(rankAirports(candidates, query, limit))
}
