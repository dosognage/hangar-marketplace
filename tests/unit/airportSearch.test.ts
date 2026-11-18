import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  broadOrFilter,
  exactCodeCandidates,
  exactCodeOrFilter,
  likeEscape,
  parseAirportQuery,
  pgrstQuote,
  rankAirports,
  type AirportQuery,
  type AirportRow,
} from '@/lib/airportSearch'

let nextId = 1
function row(ident: string, name: string, type: string, municipality: string, region: string, codes: { gps?: string; local?: string } = {}): AirportRow {
  return {
    id: nextId++, ident, name, type, municipality, iso_region: region,
    latitude_deg: 47, longitude_deg: -122, gps_code: codes.gps ?? null, local_code: codes.local ?? null,
  }
}

// Shaped like the live airports table (OurAirports, US only).
const KSEA = row('KSEA', 'Seattle–Tacoma International Airport', 'large_airport', 'Seattle', 'US-WA', { gps: 'KSEA', local: 'SEA' })
const KBFI = row('KBFI', 'King County International Airport - Boeing Field', 'medium_airport', 'Seattle', 'US-WA', { gps: 'KBFI', local: 'BFI' })
const W55  = row('W55', 'Kenmore Air Harbor Seaplane Base', 'seaplane_base', 'Seattle', 'US-WA', { local: 'W55' })
const KPAE = row('KPAE', 'Seattle Paine Field International Airport', 'medium_airport', 'Everett', 'US-WA', { gps: 'KPAE', local: 'PAE' })
const KGEG = row('KGEG', 'Spokane International Airport', 'large_airport', 'Spokane', 'US-WA', { gps: 'KGEG', local: 'GEG' })
const KSFF = row('KSFF', 'Felts Field', 'medium_airport', 'Spokane', 'US-WA', { gps: 'KSFF', local: 'SFF' })
const LA_SPOKANE = row('US-6424', 'Spokane Airport', 'small_airport', 'Ferriday', 'US-LA')
const KRNT = row('KRNT', 'Renton Municipal Airport', 'small_airport', 'Renton', 'US-WA', { gps: 'KRNT', local: 'RNT' })
const KTTN = row('KTTN', 'Trenton Mercer Airport', 'medium_airport', 'Ewing Township', 'US-NJ', { gps: 'KTTN', local: 'TTN' })
const KTIW = row('KTIW', 'Tacoma Narrows Airport', 'medium_airport', 'Tacoma', 'US-WA', { gps: 'KTIW', local: 'TIW' })
const KS36 = row('KS36', 'Norman Grier Field', 'small_airport', 'Kent', 'US-WA', { local: 'S36' })
const KDCA = row('KDCA', 'Ronald Reagan Washington National Airport', 'large_airport', 'Washington', 'US-DC', { gps: 'KDCA', local: 'DCA' })
const CO_BOEING = row('43CO', 'Boeing Field', 'small_airport', 'Paonia', 'US-CO', { gps: '43CO', local: '43CO' })

const ALL = [KSEA, KBFI, W55, KPAE, KGEG, KSFF, LA_SPOKANE, KRNT, KTTN, KTIW, KS36, KDCA, CO_BOEING]

function rank(q: string, rows = ALL, limit = 8): string[] {
  const query = parseAirportQuery(q) as AirportQuery
  assert.ok(query, `query "${q}" should parse`)
  // The route only ranks rows its SQL filter let through; approximate
  // that with the same rules so unrelated fixtures do not leak in.
  return rankAirports(rows.filter(r => wouldFetch(r, query)), query, limit).map(r => r.ident)
}

function wouldFetch(r: AirportRow, q: AirportQuery): boolean {
  const t = q.term.toLowerCase()
  const name = r.name.toLowerCase()
  const muni = (r.municipality ?? '').toLowerCase()
  if (q.kind === 'city_state') {
    return (muni.includes(t) || name.includes(t)) && (!q.stateCode || r.iso_region === `US-${q.stateCode}`)
  }
  const inState = !!q.stateCode && r.iso_region === `US-${q.stateCode}`
  if (/^[a-z0-9]{2,6}$/i.test(q.term)) {
    const codes = [r.ident, r.gps_code, r.local_code].filter(Boolean).map(c => c!.toLowerCase())
    const exact = exactCodeCandidates(q.term).map(c => c.toLowerCase())
    return inState || codes.some(c => c.startsWith(t) || exact.includes(c)) || name.includes(t) || muni.startsWith(t)
  }
  return inState || name.includes(t) || muni.includes(t)
}

test('city prefix finds Boeing Field ("seat", "seattle")', () => {
  assert.deepEqual(rank('seat').slice(0, 2), ['KSEA', 'KBFI'])
  assert.deepEqual(rank('seattle').slice(0, 3), ['KSEA', 'KBFI', 'W55'])
  // Paine Field is in Everett; it only has Seattle in its name, so it ranks after the Seattle airports.
  assert.equal(rank('seattle').at(-1), 'KPAE')
})

test('"City, ST" and "City, State Name" filter to the state', () => {
  assert.deepEqual(rank('Seattle, WA').slice(0, 2), ['KSEA', 'KBFI'])
  assert.deepEqual(rank('Seattle, Washington'), rank('Seattle, WA'))
  assert.deepEqual(rank('Spokane, Louisiana'), ['US-6424'])
})

test('name word match ("boeing")', () => {
  assert.deepEqual(rank('boeing'), ['KBFI', '43CO'])
})

test('city equals beats name and type ("spokane", "renton", "tacoma")', () => {
  assert.deepEqual(rank('spokane'), ['KGEG', 'KSFF', 'US-6424'])
  assert.deepEqual(rank('renton'), ['KRNT', 'KTTN'])
  assert.equal(rank('tacoma')[0], 'KTIW')
})

test('exact codes come first, with or without the K', () => {
  assert.equal(rank('KBFI')[0], 'KBFI')
  assert.equal(rank('BFI')[0], 'KBFI')
  assert.equal(rank('bfi')[0], 'KBFI')
  assert.equal(rank('S36')[0], 'KS36')
  assert.equal(rank('KS36')[0], 'KS36')
})

test('a bare state ranks that state first ("WA", "Washington")', () => {
  assert.deepEqual(rank('WA').slice(0, 2), ['KSEA', 'KGEG'])
  // Washington, DC (municipality equals) comes after the state of Washington.
  const washington = rank('Washington', ALL, 20)
  assert.deepEqual(washington.slice(0, 2), ['KSEA', 'KGEG'])
  assert.ok(washington.indexOf('KDCA') > washington.indexOf('KRNT'))
})

test('limit is applied after ranking', () => {
  assert.deepEqual(rank('spokane', ALL, 1), ['KGEG'])
  // Duplicates from the exact and broad fetches collapse.
  const q = parseAirportQuery('KBFI')!
  assert.equal(rankAirports([KBFI, KBFI, KSEA], q, 8).length, 2)
})

test('parseAirportQuery', () => {
  assert.equal(parseAirportQuery('x'), null)
  assert.equal(parseAirportQuery(' , '), null)
  assert.deepEqual(parseAirportQuery('Seattle,'), { kind: 'text', term: 'Seattle', stateCode: null })
  assert.deepEqual(parseAirportQuery(', WA'), { kind: 'text', term: 'WA', stateCode: 'WA' })
  assert.deepEqual(parseAirportQuery('Seattle, washington'), { kind: 'city_state', term: 'Seattle', stateCode: 'WA' })
  assert.deepEqual(parseAirportQuery('Vancouver, BC'), { kind: 'city_state', term: 'Vancouver', stateCode: null })
})

test('filters quote and escape user text', () => {
  assert.equal(pgrstQuote('a"b\\c'), '"a\\"b\\\\c"')
  assert.equal(likeEscape('100%_a\\b*'), '100\\%\\_a\\\\b')
  const f = broadOrFilter(parseAirportQuery('foo(bar), baz')!)
  assert.equal(f, 'municipality.ilike."%foo(bar)%",name.ilike."%foo(bar)%"')
  const code = broadOrFilter(parseAirportQuery('gig')!)
  assert.equal(code, 'ident.ilike."GIG%",gps_code.ilike."GIG%",local_code.ilike."GIG%",name.ilike."%gig%",municipality.ilike."gig%"')
  assert.equal(
    exactCodeOrFilter(parseAirportQuery('BFI')!),
    'ident.in.("BFI","KBFI"),gps_code.in.("BFI","KBFI"),local_code.in.("BFI","KBFI")',
  )
  assert.equal(exactCodeOrFilter(parseAirportQuery('Seattle, WA')!), null)
  assert.equal(exactCodeOrFilter(parseAirportQuery('boeing field')!), null)
})
