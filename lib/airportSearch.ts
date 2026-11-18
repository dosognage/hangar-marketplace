/**
 * Airport lookup helpers for /api/airports/search: how a query is read,
 * how it is turned into PostgREST filters, and how the rows that come back
 * are ranked. Kept free of Supabase so the ranking can be unit tested
 * (tests/unit/airportSearch.test.ts).
 */

import { resolveUsState } from '@/lib/states'

export type AirportRow = {
  id:            number
  ident:         string
  name:          string
  type:          string | null
  municipality:  string | null
  iso_region:    string | null
  latitude_deg:  number
  longitude_deg: number
  gps_code:      string | null
  local_code:    string | null
}

export const AIRPORT_COLUMNS =
  'id, ident, name, type, municipality, iso_region, latitude_deg, longitude_deg, gps_code, local_code'

// Matches identifiers like KPAE, S36, 2W1, 3W0, W16, 1WA8 etc. Short words
// ("Seat", "Gig", "Tacoma") match too, so code-like queries also search
// names and cities.
export const LOOKS_LIKE_CODE = /^[A-Z0-9]{2,6}$/i

/** Quote a value for a PostgREST or() filter so , ( ) " \ inside it are literal. */
export function pgrstQuote(value: string): string {
  return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
}

/**
 * Make user text literal inside an ILIKE pattern: escape the LIKE
 * wildcards (% _ and the escape char \) and drop *, which PostgREST
 * reads as % in like/ilike filters.
 */
export function likeEscape(value: string): string {
  return value.replace(/\*/g, '').replace(/[\\%_]/g, '\\$&')
}

export type AirportQuery =
  // "Seattle, WA" / "Seattle, Washington": city text, filtered to a state
  // when the part after the comma names one.
  | { kind: 'city_state'; term: string; stateCode: string | null }
  // Anything else. stateCode is set when the whole query is a US state
  // ("WA", "Washington"); those airports then rank right after code matches.
  | { kind: 'text'; term: string; stateCode: string | null }

/** Read a (trimmed, length-capped) query. Null when there is nothing to search. */
export function parseAirportQuery(q: string): AirportQuery | null {
  const raw = q.trim()
  if (raw.includes(',')) {
    const i = raw.indexOf(',')
    const city  = raw.slice(0, i).trim()
    const state = raw.slice(i + 1).trim()
    if (city && state) return { kind: 'city_state', term: city, stateCode: resolveUsState(state) }
    // "Seattle," or ", WA": search the part that is there.
    const only = city || state
    return only.length >= 2 ? parseAirportQuery(only.replace(/,/g, ' ')) : null
  }
  if (raw.length < 2) return null
  return { kind: 'text', term: raw, stateCode: resolveUsState(raw) }
}

/**
 * Codes that count as an exact hit for a code-like term: the term itself,
 * plus the K-prefixed ICAO form of a 3-character US code ("BFI" → "KBFI")
 * and the bare FAA form of a K-prefixed one ("KBFI" → "BFI").
 */
export function exactCodeCandidates(term: string): string[] {
  const t = term.trim().toUpperCase()
  if (!LOOKS_LIKE_CODE.test(t)) return []
  const out = new Set([t])
  if (t.length === 3) out.add(`K${t}`)
  if (t.length === 4 && t.startsWith('K')) out.add(t.slice(1))
  return [...out]
}

/**
 * The or() filter for the broad candidate fetch. City/state queries add
 * their own iso_region filter in the route; this covers the text part.
 */
export function broadOrFilter(query: AirportQuery): string {
  const term = likeEscape(query.term)
  const parts: string[] = []
  if (query.kind === 'city_state') {
    parts.push(`municipality.ilike.${pgrstQuote(`%${term}%`)}`)
    parts.push(`name.ilike.${pgrstQuote(`%${term}%`)}`)
  } else if (LOOKS_LIKE_CODE.test(query.term)) {
    const code = term.toUpperCase()
    parts.push(`ident.ilike.${pgrstQuote(`${code}%`)}`)
    parts.push(`gps_code.ilike.${pgrstQuote(`${code}%`)}`)
    parts.push(`local_code.ilike.${pgrstQuote(`${code}%`)}`)
    parts.push(`name.ilike.${pgrstQuote(`%${term}%`)}`)
    parts.push(`municipality.ilike.${pgrstQuote(`${term}%`)}`)
  } else {
    parts.push(`name.ilike.${pgrstQuote(`%${term}%`)}`)
    parts.push(`municipality.ilike.${pgrstQuote(`%${term}%`)}`)
  }
  if (query.kind === 'text' && query.stateCode) {
    parts.push(`iso_region.eq.${pgrstQuote(`US-${query.stateCode}`)}`)
  }
  return parts.join(',')
}

/** The or() filter for the exact-code fetch, or null when the term is not code-like. */
export function exactCodeOrFilter(query: AirportQuery): string | null {
  if (query.kind !== 'text') return null
  const codes = exactCodeCandidates(query.term)
  if (!codes.length) return null
  const list = `(${codes.map(pgrstQuote).join(',')})`
  return `ident.in.${list},gps_code.in.${list},local_code.in.${list}`
}

const TYPE_ORDER: Record<string, number> = {
  large_airport:  0,
  medium_airport: 1,
  small_airport:  2,
  seaplane_base:  3,
}

/** Lowercase, punctuation to spaces, single-spaced. */
function norm(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/**
 * Rank tier for one row, best first:
 *   0  exact code (ident, gps_code or local_code; K-prefix either way)
 *   1  in the state the whole query names ("WA", "Washington")
 *   2  municipality equals the term
 *   3  municipality starts with the term
 *   4  a word of the name starts with the term
 *   5  anything else the filter let through
 */
export function airportTier(row: AirportRow, query: AirportQuery): number {
  const codes = query.kind === 'text' ? exactCodeCandidates(query.term) : []
  if (codes.length) {
    for (const c of [row.ident, row.gps_code, row.local_code]) {
      if (c && codes.includes(c.toUpperCase())) return 0
    }
  }
  if (query.kind === 'text' && query.stateCode && row.iso_region === `US-${query.stateCode}`) return 1
  const term = norm(query.term)
  if (!term) return 5
  const muni = norm(row.municipality)
  if (muni && muni === term) return 2
  if (muni && muni.startsWith(term)) return 3
  if (` ${norm(row.name)}`.includes(` ${term}`)) return 4
  return 5
}

/**
 * Merge candidate lists (dropping duplicate ids), sort by tier, then
 * large > medium > small > seaplane > other, then name, and keep `limit`.
 */
export function rankAirports(candidates: AirportRow[], query: AirportQuery, limit: number): AirportRow[] {
  const byId = new Map<number, AirportRow>()
  for (const row of candidates) if (!byId.has(row.id)) byId.set(row.id, row)
  const scored = [...byId.values()].map(row => ({ row, tier: airportTier(row, query) }))
  scored.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier
    const ta = TYPE_ORDER[a.row.type ?? ''] ?? 9
    const tb = TYPE_ORDER[b.row.type ?? ''] ?? 9
    if (ta !== tb) return ta - tb
    return (a.row.name ?? '').localeCompare(b.row.name ?? '')
  })
  return scored.slice(0, limit).map(s => s.row)
}
