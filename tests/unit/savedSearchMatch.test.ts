import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  describeSearch,
  distanceNm,
  listingMatchesSearch,
  type AlertListing,
  type SavedSearchFilters,
} from '@/lib/savedSearchMatch'

const NO_FILTERS: SavedSearchFilters = {
  query: null, listing_type: null, min_price: null, max_price: null, min_sqft: null,
  property_type: null, amenities: null, near_lat: null, near_lng: null, radius_nm: null,
  location_label: null,
}
const search = (f: Partial<SavedSearchFilters>): SavedSearchFilters => ({ ...NO_FILTERS, ...f })

// KBFI and some real distances from it: KPAE (Everett) ~23 nm, KTIW (Gig Harbor) ~23 nm,
// KGEG (Spokane) ~195 nm.
const KBFI = { lat: 47.53, lng: -122.302 }
const KPAE = { lat: 47.9063, lng: -122.282 }
const KGEG = { lat: 47.6199, lng: -117.5338 }

let nextId = 1
function listing(f: Partial<AlertListing>): AlertListing {
  return {
    id: String(nextId++), title: 'Test hangar', airport_name: 'Snohomish County Airport', airport_code: 'KPAE',
    city: 'Everett', state: 'WA', listing_type: 'sale', property_type: 'hangar',
    asking_price: 250_000, monthly_lease: null, square_feet: 1600, amenities: ['heat', 'power'],
    latitude: KPAE.lat, longitude: KPAE.lng, hangar_lat: null, hangar_lng: null,
    ...f,
  }
}

test('distanceNm', () => {
  assert.equal(distanceNm(KBFI.lat, KBFI.lng, KBFI.lat, KBFI.lng), 0)
  const toPae = distanceNm(KBFI.lat, KBFI.lng, KPAE.lat, KPAE.lng)
  assert.ok(toPae > 22 && toPae < 23, `KBFI to KPAE ${toPae}`)
  const toGeg = distanceNm(KBFI.lat, KBFI.lng, KGEG.lat, KGEG.lng)
  assert.ok(toGeg > 185 && toGeg < 200, `KBFI to KGEG ${toGeg}`)
})

test('an alert with no filters matches anything', () => {
  assert.ok(listingMatchesSearch(listing({}), NO_FILTERS))
})

test('radius uses the hangar pin first, then the listing point; no coordinates drops out', () => {
  const s = search({ near_lat: KBFI.lat, near_lng: KBFI.lng, radius_nm: 50, location_label: 'Within 50 nm of KBFI' })
  assert.ok(listingMatchesSearch(listing({}), s))
  assert.ok(!listingMatchesSearch(listing({ latitude: KGEG.lat, longitude: KGEG.lng }), s))
  // Pin near KBFI wins over a far-away airport point.
  assert.ok(listingMatchesSearch(listing({ latitude: KGEG.lat, longitude: KGEG.lng, hangar_lat: KPAE.lat, hangar_lng: KPAE.lng }), s))
  assert.ok(!listingMatchesSearch(listing({ latitude: null, longitude: null }), s))
  assert.ok(!listingMatchesSearch(listing({}), { ...s, radius_nm: 20 }))
})

test('amenities: the listing must have every required key', () => {
  assert.ok(listingMatchesSearch(listing({}), search({ amenities: ['heat'] })))
  assert.ok(listingMatchesSearch(listing({}), search({ amenities: ['heat', 'power'] })))
  assert.ok(!listingMatchesSearch(listing({}), search({ amenities: ['heat', 'water'] })))
  assert.ok(!listingMatchesSearch(listing({ amenities: null }), search({ amenities: ['heat'] })))
  assert.ok(listingMatchesSearch(listing({ amenities: null }), search({ amenities: [] })))
})

test('price floor and ceiling use asking_price for sale, monthly_lease for lease', () => {
  assert.ok(listingMatchesSearch(listing({}), search({ min_price: 100_000, max_price: 500_000 })))
  assert.ok(!listingMatchesSearch(listing({}), search({ min_price: 300_000 })))
  assert.ok(!listingMatchesSearch(listing({}), search({ max_price: 200_000 })))
  assert.ok(!listingMatchesSearch(listing({ asking_price: null }), search({ min_price: 1 })))
  const lease = listing({ listing_type: 'lease', asking_price: null, monthly_lease: 900 })
  assert.ok(listingMatchesSearch(lease, search({ listing_type: 'lease', min_price: 500, max_price: 1000 })))
  assert.ok(!listingMatchesSearch(lease, search({ listing_type: 'lease', min_price: 1000 })))
})

test('listing type: "both" listings match sale and lease alerts', () => {
  const both = listing({ listing_type: 'both', asking_price: 300_000, monthly_lease: 1200 })
  assert.ok(listingMatchesSearch(both, search({ listing_type: 'sale' })))
  assert.ok(listingMatchesSearch(both, search({ listing_type: 'lease' })))
  assert.ok(listingMatchesSearch(both, search({ listing_type: 'lease', max_price: 1500 })))
  assert.ok(!listingMatchesSearch(both, search({ listing_type: 'space' })))
  assert.ok(!listingMatchesSearch(listing({ listing_type: 'lease' }), search({ listing_type: 'sale' })))
})

test('property type and square feet', () => {
  assert.ok(listingMatchesSearch(listing({}), search({ property_type: 'hangar', min_sqft: 1000 })))
  assert.ok(!listingMatchesSearch(listing({}), search({ property_type: 'airport_home' })))
  assert.ok(!listingMatchesSearch(listing({ square_feet: 900 }), search({ min_sqft: 1000 })))
})

test('a state query matches listings.state only', () => {
  const wa = search({ query: 'WA', location_label: 'Washington' })
  assert.ok(listingMatchesSearch(listing({}), wa))
  assert.ok(listingMatchesSearch(listing({ state: 'Washington' }), wa))
  assert.ok(listingMatchesSearch(listing({ state: 'wa' }), search({ query: 'washington' })))
  // "wa" inside a city or airport name no longer counts.
  const iowa = listing({ state: 'IA', city: 'Ottumwa', airport_name: 'Ottumwa Regional' })
  assert.ok(!listingMatchesSearch(iowa, wa))
  assert.ok(!listingMatchesSearch(listing({ state: 'OR' }), wa))
})

test('other queries keep the contains match on city, state, airport name and code', () => {
  assert.ok(listingMatchesSearch(listing({}), search({ query: 'everett' })))
  assert.ok(listingMatchesSearch(listing({}), search({ query: 'pae' })))
  assert.ok(listingMatchesSearch(listing({}), search({ query: 'Snohomish' })))
  assert.ok(!listingMatchesSearch(listing({}), search({ query: 'Eastsound, WA' })))
  // Point and query together: both apply.
  const both = search({ query: 'everett', near_lat: KBFI.lat, near_lng: KBFI.lng, radius_nm: 50 })
  assert.ok(listingMatchesSearch(listing({}), both))
  assert.ok(!listingMatchesSearch(listing({ city: 'Arlington' }), both))
})

test('describeSearch reads in plain words', () => {
  assert.equal(describeSearch(NO_FILTERS), '')
  assert.equal(
    describeSearch(search({
      near_lat: KBFI.lat, near_lng: KBFI.lng, radius_nm: 50, location_label: 'Within 50 nm of KBFI',
      listing_type: 'sale', min_price: 100_000, max_price: 500_000, property_type: 'hangar',
      min_sqft: 1000, amenities: ['heat'],
    })),
    'within 50 nm of KBFI, for sale, $100,000 to $500,000, hangars, 1,000+ sq ft, heated',
  )
  assert.equal(describeSearch(search({ query: 'WA', location_label: 'Washington' })), 'in Washington')
  assert.equal(describeSearch(search({ query: 'oregon' })), 'in Oregon')
  assert.equal(describeSearch(search({ query: 'Gig Harbor', max_price: 500_000 })), 'matching "Gig Harbor", up to $500,000')
  assert.equal(
    describeSearch(search({ listing_type: 'lease', min_price: 400, amenities: ['heat', 'power', 'water'] })),
    'for lease, $400/mo and up, heated, with power and water',
  )
  assert.equal(describeSearch(search({ near_lat: 1, near_lng: 2, radius_nm: 25, location_label: 'KBFI' })), 'within 25 nm of KBFI')
  // Old alerts (no new columns) still describe themselves.
  assert.equal(
    describeSearch(search({ query: 'Everett', listing_type: 'space', max_price: 800, min_sqft: 500 })),
    'matching "Everett", space available, up to $800/mo, 500+ sq ft',
  )
  // No em dashes in user-facing copy.
  assert.ok(!describeSearch(search({ listing_type: 'both', property_type: 'fly_in_community' })).includes('\u2014'))
})
