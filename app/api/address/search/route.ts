import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/address/search?q=123+Main+St+Seattle
 *
 * Proxies Nominatim (OpenStreetMap) to provide US address autocomplete.
 * Returns up to 6 structured address suggestions.
 *
 * Response shape (array):
 * [{
 *   display: "123 Main St, Seattle, WA 98101",
 *   street:  "123 Main St",
 *   city:    "Seattle",
 *   state:   "WA",
 *   zip:     "98101",
 *   lat:     47.6062,
 *   lng:    -122.3321,
 * }]
 */

// US state name → abbreviation map for normalizing Nominatim results
const STATE_ABBR: Record<string, string> = {
  'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA',
  'Colorado':'CO','Connecticut':'CT','Delaware':'DE','Florida':'FL','Georgia':'GA',
  'Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA',
  'Kansas':'KS','Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD',
  'Massachusetts':'MA','Michigan':'MI','Minnesota':'MN','Mississippi':'MS','Missouri':'MO',
  'Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ',
  'New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH',
  'Oklahoma':'OK','Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC',
  'South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT',
  'Virginia':'VA','Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY',
  'District of Columbia':'DC',
}

type NominatimResult = {
  lat: string
  lon: string
  display_name: string
  address: {
    house_number?: string
    road?: string
    neighbourhood?: string
    suburb?: string
    city?: string
    town?: string
    village?: string
    county?: string
    state?: string
    postcode?: string
    country_code?: string
  }
}

function buildStreet(addr: NominatimResult['address']): string {
  const parts = [addr.house_number, addr.road].filter(Boolean)
  return parts.join(' ')
}

function buildCity(addr: NominatimResult['address']): string {
  return addr.city ?? addr.town ?? addr.village ?? addr.suburb ?? addr.county ?? ''
}

function buildStateAbbr(addr: NominatimResult['address']): string {
  const full = addr.state ?? ''
  return STATE_ABBR[full] ?? full
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  if (q.length < 4) return NextResponse.json([])

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'json')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('countrycodes', 'us')
  url.searchParams.set('limit', '6')
  // Prefer results with a street number
  url.searchParams.set('featuretype', 'settlement')

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'HangarMarketplace/1.0 (hangarmarketplace.com)' },
    })
    if (!res.ok) return NextResponse.json([])

    const data = await res.json() as NominatimResult[]

    // Filter to results that have a road (actual address-like results)
    const results = data
      .filter(r => r.address?.country_code === 'us')
      .map(r => {
        const street   = buildStreet(r.address)
        const city     = buildCity(r.address)
        const state    = buildStateAbbr(r.address)
        const zip      = r.address.postcode ?? ''
        const display  = [
          street,
          city,
          [state, zip].filter(Boolean).join(' '),
        ].filter(Boolean).join(', ')

        return {
          display,
          street,
          city,
          state,
          zip,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        }
      })
      // Only keep results that have at least a city or street
      .filter(r => r.city || r.street)

    return NextResponse.json(results)
  } catch (err) {
    console.error('[address/search]', err)
    return NextResponse.json([])
  }
}
