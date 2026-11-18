/**
 * Saved-search (alert) matching for the hourly notify cron
 * (app/api/cron/saved-searches-notify). The cron narrows candidates in SQL
 * with the same rules, then runs every candidate through
 * listingMatchesSearch, which is the full definition of a match and the
 * only place the radius and amenity filters are applied. Pure, so it is
 * unit tested in tests/unit/savedSearchMatch.test.ts.
 */

import { US_STATE_NAMES, resolveUsState } from '@/lib/states'

/** The saved_searches columns the matcher reads. Every filter is optional. */
export type SavedSearchFilters = {
  query:          string | null
  listing_type:   string | null
  min_price:      number | null
  max_price:      number | null
  min_sqft:       number | null
  property_type:  string | null
  amenities:      string[] | null
  near_lat:       number | null
  near_lng:       number | null
  radius_nm:      number | null
  location_label: string | null
}

/** The listings columns the matcher reads. */
export type AlertListing = {
  id:            string
  title:         string
  airport_name:  string | null
  airport_code:  string | null
  city:          string | null
  state:         string | null
  listing_type:  string
  property_type: string | null
  asking_price:  number | null
  monthly_lease: number | null
  square_feet:   number | null
  amenities:     unknown
  latitude:      number | null
  longitude:     number | null
  hangar_lat:    number | null
  hangar_lng:    number | null
}

export const ALERT_LISTING_COLUMNS =
  'id, title, airport_name, airport_code, city, state, listing_type, property_type, ' +
  'asking_price, monthly_lease, square_feet, amenities, latitude, longitude, hangar_lat, hangar_lng'

const EARTH_RADIUS_NM = 3440.065

/** Great-circle (haversine) distance in nautical miles. */
export function distanceNm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLng = rad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.min(1, Math.sqrt(a)))
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** The alert's point and radius, when it has a complete one. */
export function searchPoint(s: SavedSearchFilters): { lat: number; lng: number; radiusNm: number } | null {
  const lat = num(s.near_lat)
  const lng = num(s.near_lng)
  const radiusNm = num(s.radius_nm)
  return lat != null && lng != null && radiusNm != null ? { lat, lng, radiusNm } : null
}

/** Required amenity keys: unique, non-empty strings. */
export function requiredAmenities(s: SavedSearchFilters): string[] {
  if (!Array.isArray(s.amenities)) return []
  return [...new Set(s.amenities.filter((a): a is string => typeof a === 'string').map(a => a.trim()).filter(Boolean))]
}

/**
 * The listings column the price filters apply to: monthly_lease for lease
 * and space alerts, asking_price otherwise (same rule max_price always had).
 */
export function priceColumn(s: SavedSearchFilters): 'monthly_lease' | 'asking_price' {
  return s.listing_type === 'lease' || s.listing_type === 'space' ? 'monthly_lease' : 'asking_price'
}

/**
 * listing_type values an alert accepts, or null for any. A "both" listing
 * is for sale AND for lease, so it matches either alert.
 */
export function acceptedListingTypes(s: SavedSearchFilters): string[] | null {
  if (s.listing_type === 'sale' || s.listing_type === 'lease') return [s.listing_type, 'both']
  return s.listing_type ? [s.listing_type] : null
}

/** The query text, trimmed; null when blank. */
export function searchQuery(s: SavedSearchFilters): string | null {
  const q = s.query?.trim()
  return q ? q : null
}

/**
 * When the query is exactly a US state ("WA", "wa", "Washington"), the
 * listings.state values that count as that state: the code and the full
 * name (compared case-insensitively). Null for any other query.
 */
export function queryStateValues(s: SavedSearchFilters): string[] | null {
  const code = resolveUsState(searchQuery(s))
  return code ? [code, US_STATE_NAMES[code]] : null
}

/** Does this listing satisfy every filter on the alert? */
export function listingMatchesSearch(l: AlertListing, s: SavedSearchFilters): boolean {
  // Text query: a state matches listings.state only; anything else is a
  // contains match on city, state, airport name or airport code.
  const q = searchQuery(s)
  if (q) {
    const states = queryStateValues(s)
    if (states) {
      const st = (l.state ?? '').trim().toLowerCase()
      if (!states.some(v => v.toLowerCase() === st)) return false
    } else {
      // * is dropped to mirror the SQL side (PostgREST reads it as a wildcard).
      const needle = q.replace(/\*/g, '').toLowerCase()
      const hay = [l.city, l.state, l.airport_name, l.airport_code]
      if (!hay.some(h => (h ?? '').toLowerCase().includes(needle))) return false
    }
  }

  const types = acceptedListingTypes(s)
  if (types && !types.includes(l.listing_type)) return false

  if (s.property_type && l.property_type !== s.property_type) return false

  const minPrice = num(s.min_price)
  const maxPrice = num(s.max_price)
  if (minPrice || maxPrice) {
    const price = num(l[priceColumn(s)])
    if (price == null) return false
    if (minPrice && price < minPrice) return false
    if (maxPrice && price > maxPrice) return false
  }

  const minSqft = num(s.min_sqft)
  if (minSqft) {
    const sqft = num(l.square_feet)
    if (sqft == null || sqft < minSqft) return false
  }

  const required = requiredAmenities(s)
  if (required.length) {
    const has = Array.isArray(l.amenities) ? l.amenities : []
    if (!required.every(a => has.includes(a))) return false
  }

  const point = searchPoint(s)
  if (point) {
    const lat = num(l.hangar_lat) ?? num(l.latitude)
    const lng = num(l.hangar_lng) ?? num(l.longitude)
    if (lat == null || lng == null) return false
    if (distanceNm(point.lat, point.lng, lat, lng) > point.radiusNm) return false
  }

  return true
}

// ── Plain-words description for the email ─────────────────────────────────

const money = (n: number) => `$${n.toLocaleString('en-US')}`

const LISTING_TYPE_WORDS: Record<string, string> = {
  sale:  'for sale',
  lease: 'for lease',
  space: 'space available',
  both:  'for sale or lease',
}

const PROPERTY_TYPE_WORDS: Record<string, string> = {
  hangar:           'hangars',
  airport_home:     'airport homes',
  land:             'land',
  fly_in_community: 'fly-in communities',
}

// heat reads as "heated"; the rest as "with power, water and WiFi".
const AMENITY_WORDS: Record<string, string> = {
  power:            'power',
  water:            'water',
  air_conditioning: 'air conditioning',
  bathroom:         'a bathroom',
  wifi:             'WiFi',
  fuel_nearby:      'fuel nearby',
  floor_drain:      'a floor drain',
  compressed_air:   'compressed air',
  office_space:     'office space',
  loft_storage:     'loft storage',
  security_system:  'a security system',
}

function joinAnd(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const startsWithWithin = (s: string) => /^within\b/i.test(s)

/**
 * The alert's filters in plain words, e.g. "within 50 nm of KBFI, for sale,
 * $100,000 to $500,000, hangars, 1,000+ sq ft, heated". Empty when the
 * alert has no filters. Plain text: escape it before putting it in HTML.
 */
export function describeSearch(s: SavedSearchFilters): string {
  const parts: string[] = []
  const label = s.location_label?.trim() || null
  const point = searchPoint(s)
  const q = searchQuery(s)

  // Where. location_label is the app's human text for the point ("Within
  // 50 nm of KBFI") or for a state query ("Washington").
  if (point) {
    if (label && startsWithWithin(label)) parts.push(lowerFirst(label))
    else parts.push(`within ${point.radiusNm} nm${label ? ` of ${label}` : ''}`)
  }
  if (q) {
    const stateCode = resolveUsState(q)
    if (!point && label) parts.push(startsWithWithin(label) ? lowerFirst(label) : `in ${label}`)
    else if (stateCode) parts.push(`in ${US_STATE_NAMES[stateCode]}`)
    else parts.push(`matching "${q}"`)
  }

  if (s.listing_type) parts.push(LISTING_TYPE_WORDS[s.listing_type] ?? s.listing_type)

  const minPrice = num(s.min_price)
  const maxPrice = num(s.max_price)
  const perMonth = priceColumn(s) === 'monthly_lease' ? '/mo' : ''
  if (minPrice && maxPrice) parts.push(`${money(minPrice)} to ${money(maxPrice)}${perMonth}`)
  else if (maxPrice)        parts.push(`up to ${money(maxPrice)}${perMonth}`)
  else if (minPrice)        parts.push(`${money(minPrice)}${perMonth} and up`)

  if (s.property_type) {
    parts.push(PROPERTY_TYPE_WORDS[s.property_type] ?? s.property_type.replace(/_/g, ' '))
  }

  const minSqft = num(s.min_sqft)
  if (minSqft) parts.push(`${minSqft.toLocaleString('en-US')}+ sq ft`)

  const required = requiredAmenities(s)
  if (required.includes('heat')) parts.push('heated')
  const withWords = required.filter(a => a !== 'heat').map(a => AMENITY_WORDS[a] ?? a.replace(/_/g, ' '))
  if (withWords.length) parts.push(`with ${joinAnd(withWords)}`)

  return parts.join(', ')
}
