/**
 * Curated city registry for /hangars/city/[slug] SEO landing pages.
 *
 * Two tiers of cities live here:
 *
 *   TIER 1 (real inventory) — cities where we currently have approved
 *   listings. The market snapshot and listings grid render from live DB
 *   data; the market-context paragraph is hand-written for SEO uniqueness.
 *
 *   TIER 2 (target markets) — GA hubs where we WANT inventory. The page
 *   surfaces the empty state with a strong "be the first to list" CTA
 *   and captures the "hangar for sale [city]" search intent so pilots
 *   land on HM instead of a generic listing site.
 *
 * Everything is hand-written on purpose. Generated / templated copy for
 * every city would signal thin content to Google. Adding a new city =
 * append an entry here + rerun the sitemap.
 */

export interface CityEntry {
  slug:          string   // URL slug: `denver-co`, `seattle-wa`
  city:          string   // Display name: "Denver"
  state:         string   // 2-letter abbrev: "CO"
  stateName:     string   // Full state name: "Colorado"
  stateSlug:     string   // Slug used by /hangars/[state]: "colorado"
  metroDesc:     string   // 1-sentence positioning line (used in metadata description)
  marketContext: string   // 2-3 sentence hand-written body paragraph — must be UNIQUE per city
  airports:      { icao: string; name: string }[]   // Primary airports in the metro
  matchCities?:  string[] // Additional city names to include in the DB match (e.g. suburbs). Case-insensitive.
}

export const CITIES: CityEntry[] = [
  // ── Tier 1: real inventory today ──────────────────────────────────
  {
    slug:      'everett-wa',
    city:      'Everett',
    state:     'WA',
    stateName: 'Washington',
    stateSlug: 'washington',
    metroDesc: 'Home of Paine Field (KPAE) — Boeing widebody line and one of the highest hangar density fields in the Pacific Northwest.',
    marketContext:
      'Everett sits inside one of the most active general aviation corridors in the country. Paine Field (KPAE) shares the ramp with Boeing widebody assembly and hosts a large community of privately owned box and T-hangars along Airport Road. Rental T-hangars in Everett typically list in the $400–$700/month range; box hangars for sale trade based on door size and utility hookups, with high-end insulated boxes fetching six figures.',
    airports:  [
      { icao: 'KPAE', name: 'Paine Field' },
    ],
  },
  {
    slug:      'mcminnville-or',
    city:      'McMinnville',
    state:     'OR',
    stateName: 'Oregon',
    stateSlug: 'oregon',
    metroDesc: 'McMinnville Municipal (KMMV) — home of the Evergreen Aviation Museum and a growing base of privately owned hangars.',
    marketContext:
      'McMinnville Municipal Airport (KMMV) has grown from a quiet Willamette Valley field into one of the most active privately-owned hangar markets in Oregon. Its position between the coast, Portland, and the wine country makes it a hub for weekend flying and cross-country stops. Recent activity has trended toward larger box hangars capable of accommodating owner-flown turboprops alongside piston singles.',
    airports:  [
      { icao: 'KMMV', name: 'McMinnville Municipal' },
    ],
  },
  {
    slug:      'seattle-wa',
    city:      'Seattle',
    state:     'WA',
    stateName: 'Washington',
    stateSlug: 'washington',
    metroDesc: 'Seattle-area hangar inventory across Boeing Field (KBFI), Renton (KRNT), and Auburn (KAWO).',
    marketContext:
      'The greater Seattle metro is served by three primary GA fields — Boeing Field (KBFI), Renton (KRNT), and Auburn (KAWO) — plus a ring of smaller relievers. Hangar supply is chronically tight; waiting lists at Boeing Field commonly run multi-year for city-owned T-hangars, driving private sales and long-term leases into a premium segment. Buyers in this market are typically willing to pay for insulated construction, reliable power, and easy ramp access.',
    airports:  [
      { icao: 'KBFI', name: 'Boeing Field / King County International' },
      { icao: 'KRNT', name: 'Renton Municipal' },
    ],
    matchCities: ['Seattle', 'Kenmore'],
  },
  {
    slug:      'renton-wa',
    city:      'Renton',
    state:     'WA',
    stateName: 'Washington',
    stateSlug: 'washington',
    metroDesc: 'Renton Municipal (KRNT) — Boeing 737 assembly and a dense concentration of privately-owned hangars.',
    marketContext:
      'Renton Municipal (KRNT) sits at the south end of Lake Washington and shares its ramp with Boeing 737 production. Its 5,382-foot runway and immediate freeway access make it a convenient base for owners flying pistons and light turboprops. Hangar turnover here is limited — most transactions are private, off-market until listed publicly, and pricing reflects the tight supply.',
    airports:  [
      { icao: 'KRNT', name: 'Renton Municipal' },
    ],
  },

  // ── Tier 2: target markets, aspirational inventory ────────────────
  {
    slug:      'naples-fl',
    city:      'Naples',
    state:     'FL',
    stateName: 'Florida',
    stateSlug: 'florida',
    metroDesc: 'Naples Municipal (KAPF) — one of the busiest privately-owned hangar markets in the Southeast.',
    marketContext:
      'Naples Municipal Airport (KAPF) sits inside a market that consistently ranks among the top general aviation hangar trading corridors in the United States. Seasonal winter demand from northern owners flying south for the season pushes rental rates and sale prices well above the Florida average. Inventory turns quickly when it hits the market — most transactions happen off-list through brokers and word of mouth.',
    airports:  [
      { icao: 'KAPF', name: 'Naples Municipal' },
    ],
  },
  {
    slug:      'denver-co',
    city:      'Denver',
    state:     'CO',
    stateName: 'Colorado',
    stateSlug: 'colorado',
    metroDesc: 'Front Range GA hangar market across Centennial (KAPA), Rocky Mountain Metropolitan (KBJC), and Denver International (KDEN) reliever fields.',
    marketContext:
      'The Denver metro is one of the largest general aviation markets in the western US, anchored by Centennial (KAPA), Rocky Mountain Metropolitan (KBJC), and a ring of reliever fields. Hangar inventory across the Front Range is deeply supply-constrained; owner-occupied box hangars at KAPA can trade at prices comparable to coastal markets. Buyers weigh field elevation (5,800+ ft density altitude) and hangar door height carefully when comparing options.',
    airports:  [
      { icao: 'KAPA', name: 'Centennial Airport' },
      { icao: 'KBJC', name: 'Rocky Mountain Metropolitan' },
    ],
  },
  {
    slug:      'boise-id',
    city:      'Boise',
    state:     'ID',
    stateName: 'Idaho',
    stateSlug: 'idaho',
    metroDesc: 'Boise Air Terminal (KBOI) and the surrounding Treasure Valley GA fields.',
    marketContext:
      'Idaho\'s general aviation growth over the past decade has pushed Boise (KBOI) and Nampa (KMAN) into some of the most in-demand hangar markets in the Mountain West. Backcountry flying culture, warbird ownership, and turboprop expansion at KBOI have all contributed to steady price appreciation for owner-flown hangars. New construction is rare due to airport land constraints, which keeps existing inventory tight.',
    airports:  [
      { icao: 'KBOI', name: 'Boise Air Terminal / Gowen Field' },
      { icao: 'KMAN', name: 'Nampa Municipal' },
    ],
  },
  {
    slug:      'bozeman-mt',
    city:      'Bozeman',
    state:     'MT',
    stateName: 'Montana',
    stateSlug: 'montana',
    metroDesc: 'Bozeman Yellowstone International (KBZN) — gateway to Yellowstone and one of the highest-growth GA markets in the northern Rockies.',
    marketContext:
      'Bozeman Yellowstone International (KBZN) has been one of the fastest-growing general aviation airports in the country, driven by a combination of tourism traffic, Yellowstone gateway proximity, and inbound relocation of hangar owners from the coasts. Hangar demand has outpaced construction, and privately-listed box hangars at KBZN frequently trade at premiums that would have been unthinkable a decade ago. Newer owners weigh winter heat, snow load, and Bozeman\'s wind exposure when evaluating structures.',
    airports:  [
      { icao: 'KBZN', name: 'Bozeman Yellowstone International' },
    ],
  },

  // ── Round 2: mountain-west resort + Great Lakes + SE coast ────────
  {
    slug:      'aspen-co',
    city:      'Aspen',
    state:     'CO',
    stateName: 'Colorado',
    stateSlug: 'colorado',
    metroDesc: 'Aspen–Pitkin County (KASE) — one of the most premium GA markets in the country, serving Roaring Fork Valley and the Aspen–Snowmass resort corridor.',
    marketContext:
      'Aspen–Pitkin County (KASE) sits at 7,820 feet in a high-mountain valley, serving one of the most concentrated high-net-worth aviation communities in the United States. Hangar space is intensely limited by both physical airport constraints and municipal restrictions, and when a private hangar does come to market it typically trades at multiples of the national average. Buyers evaluating options here weigh runway performance implications at altitude, seasonal weather (KASE closes to jet operations at times), and the small number of nearby alternatives (Eagle County KEGE and Rifle Garfield KRIL).',
    airports:  [
      { icao: 'KASE', name: 'Aspen–Pitkin County / Sardy Field' },
      { icao: 'KEGE', name: 'Eagle County Regional' },
    ],
  },
  {
    slug:      'traverse-city-mi',
    city:      'Traverse City',
    state:     'MI',
    stateName: 'Michigan',
    stateSlug: 'michigan',
    metroDesc: 'Cherry Capital (KTVC) — the primary GA gateway to northern Michigan resort country and Grand Traverse Bay.',
    marketContext:
      'Cherry Capital Airport (KTVC) is the dominant general aviation field for northern Michigan, serving Grand Traverse Bay, Sleeping Bear Dunes, and the resort corridor stretching from Petoskey to Charlevoix. Seasonal owner-flown traffic drives disproportionate hangar demand during the summer months, and inventory has tightened considerably as second-home ownership in the region has grown. Buyers here weigh winter operations (heated hangars are a meaningful premium) and proximity to Interlochen and the northern lakeshore communities.',
    airports:  [
      { icao: 'KTVC', name: 'Cherry Capital Airport' },
    ],
  },
  {
    slug:      'sun-valley-id',
    city:      'Sun Valley',
    state:     'ID',
    stateName: 'Idaho',
    stateSlug: 'idaho',
    metroDesc: 'Friedman Memorial (KSUN) — the highest-elevation and most premium GA field in the Sawtooth Mountains, serving Ketchum and the Sun Valley resort community.',
    marketContext:
      'Friedman Memorial (KSUN) sits at 5,318 feet in the Wood River Valley, serving Sun Valley, Ketchum, and one of the older concentrations of aviation-owning second-home residents in the American West. The airport\'s single 7,550-foot runway and mountain-terrain approach profile make hangar space a serious asset for owner-flown turboprop and light jet operators. Inventory is genuinely rare — most transactions happen off-market between long-established owners, and when a hangar does list publicly, it moves quickly.',
    airports:  [
      { icao: 'KSUN', name: 'Friedman Memorial Airport' },
    ],
  },
  {
    slug:      'wilmington-nc',
    city:      'Wilmington',
    state:     'NC',
    stateName: 'North Carolina',
    stateSlug: 'north-carolina',
    metroDesc: 'Wilmington International (KILM) — the coastal GA hub for southeastern North Carolina and Cape Fear.',
    marketContext:
      'Wilmington International (KILM) is the dominant GA field for the southeastern North Carolina coast, serving Wrightsville Beach, Bald Head Island, and the broader Cape Fear region. The area\'s combination of coastal second-home ownership, mild winter operating conditions, and proximity to the Charlotte/Raleigh metros has driven steady hangar demand growth. Owners in this market often value hurricane-resilient construction and elevated pad heights alongside the usual dimensions.',
    airports:  [
      { icao: 'KILM', name: 'Wilmington International Airport' },
    ],
  },
  {
    slug:      'truckee-ca',
    city:      'Truckee',
    state:     'CA',
    stateName: 'California',
    stateSlug: 'california',
    metroDesc: 'Truckee Tahoe (KTRK) — the primary GA field for the Lake Tahoe region and one of the most active mountain airports in the Sierra Nevada.',
    marketContext:
      'Truckee Tahoe Airport (KTRK) sits at 5,900 feet on the north side of the Lake Tahoe basin, serving Truckee, Northstar, Tahoe City, and the broader north-shore resort corridor. The airport has invested heavily in noise abatement, fire preparedness, and community-relations programming, and its hangar inventory is closely watched by both Bay Area second-home owners and California-based turboprop operators. Density altitude, snow load, and heated-hangar premiums are the practical considerations for buyers here.',
    airports:  [
      { icao: 'KTRK', name: 'Truckee Tahoe Airport' },
    ],
  },
]

const BY_SLUG = new Map<string, CityEntry>(CITIES.map(c => [c.slug, c]))

export function getCityBySlug(slug: string): CityEntry | undefined {
  return BY_SLUG.get(slug)
}

export function allCitySlugs(): string[] {
  return CITIES.map(c => c.slug)
}

/**
 * Returns the ilike-safe list of city names to match against listings.city
 * for a given city entry — the primary city plus any explicit matchCities.
 */
export function cityMatchNames(entry: CityEntry): string[] {
  const set = new Set<string>([entry.city, ...(entry.matchCities ?? [])])
  return Array.from(set)
}
