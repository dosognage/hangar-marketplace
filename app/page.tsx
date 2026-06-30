export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Browse Airplane Hangars for Sale & Lease | Hangar Marketplace',
  description: 'Find aircraft hangars for sale, lease, and rent at airports across the US. Filter by state, size, price, and hangar type. Free to browse.',
  alternates: { canonical: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com' },
  openGraph: {
    title: 'Browse Airplane Hangars for Sale & Lease',
    description: 'Find aircraft hangars for sale, lease, and rent at airports across the US.',
    type: 'website',
  },
}

import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { createServerClient } from '@/lib/supabase-server'
import SearchFilters from '@/app/components/SearchFilters'
import SplitView from '@/app/components/SplitView'
import SaveSearchWidget from '@/app/components/SaveSearchWidget'
import PreLaunchSignup from '@/app/components/PreLaunchSignup'
import { geocodeLocation, distanceMiles } from '@/lib/geocode'
import { getDefaultAircraft } from '@/app/actions/aircraft'

type Photo = { storage_path: string; display_order: number }

type Listing = {
  id: string
  title: string
  airport_name: string
  airport_code: string
  city: string
  state: string
  listing_type: string
  ownership_type: string
  asking_price: number | null
  monthly_lease: number | null
  square_feet: number | null
  door_width: number | null
  door_height: number | null
  hangar_depth: number | null
  description: string | null
  contact_name: string
  latitude: number | null
  longitude: number | null
  is_featured: boolean
  featured_until: string | null
  is_sponsored: boolean
  sponsored_until: string | null
  is_sample: boolean
  broker_profile_id: string | null
  listing_photos: Photo[]
  user_id?: string | null
  _tier_priority?: number
}

type HomePageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

export default async function HomePage({ searchParams }: HomePageProps) {
  const { q, type, minPrice, maxPrice, minSqft, radius, minRunway, brokerOnly } = await searchParams

  // Get logged-in user + their saved listing IDs (server-side, cookie auth)
  const serverSupabase = await createServerClient()
  const { data: { user } } = await serverSupabase.auth.getUser()
  let savedIds: string[] = []
  if (user) {
    const { data } = await serverSupabase
      .from('saved_listings')
      .select('listing_id')
      .eq('user_id', user.id)
    savedIds = (data ?? []).map((r: { listing_id: string }) => r.listing_id)
  }

  const str = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v ?? ''

  const qVal          = str(q)
  const typeVal       = str(type)
  const minPriceVal   = str(minPrice)
  const maxPriceVal   = str(maxPrice)
  const minSqftVal    = str(minSqft)
  const radiusVal     = str(radius)
  const minRunwayVal  = str(minRunway)
  const brokerOnlyVal = str(brokerOnly)

  // Fetch featured brokers for spotlight (approved, with bio or avatar)
  const { data: featuredBrokers } = await supabase
    .from('broker_profiles')
    .select('id, full_name, brokerage, avatar_url, bio, specialty_airports, is_verified')
    .eq('status', 'approved')
    .order('created_at', { ascending: true })
    .limit(6)

  // ── Radius geocoding ────────────────────────────────────────────────────
  // When a radius is requested, geocode the search query to a lat/lng center.
  // We then skip the text-based DB filter and instead post-filter by distance.
  const radiusMiles = parseFloat(radiusVal)
  const useRadius = !isNaN(radiusMiles) && radiusMiles > 0 && qVal.trim().length > 0
  const radiusCenter = useRadius ? await geocodeLocation(qVal) : null

  // ── Build query ─────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('listings')
    .select('*, listing_photos(storage_path, display_order)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  // Only apply text search when NOT doing radius (radius uses geocode instead)
  if (qVal.trim() && !useRadius) {
    const like = `%${qVal.trim()}%`
    query = query.or(
      `city.ilike.${like},state.ilike.${like},airport_name.ilike.${like},airport_code.ilike.${like}`
    )
  }
  if (typeVal === 'sale' || typeVal === 'lease' || typeVal === 'space') query = query.eq('listing_type', typeVal)

  const priceCol = typeVal === 'lease' || typeVal === 'space' ? 'monthly_lease' : 'asking_price'
  const minP = parseFloat(minPriceVal)
  const maxP = parseFloat(maxPriceVal)
  if (!isNaN(minP) && minP > 0) query = query.gte(priceCol, minP)
  if (!isNaN(maxP) && maxP > 0) query = query.lte(priceCol, maxP)

  const minSq = parseFloat(minSqftVal)
  if (!isNaN(minSq) && minSq > 0) query = query.gte('square_feet', minSq)

  const minRw = parseFloat(minRunwayVal)
  if (!isNaN(minRw) && minRw > 0) query = query.gte('runway_length_ft', minRw)
  if (brokerOnlyVal === '1') query = query.not('broker_profile_id', 'is', null)

  let { data: listings, error } = await query

  // Fallback: if listing_photos table doesn't exist yet, retry without it
  if (error) {
    console.warn('Retrying without photos:', error.message)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fallback: any = supabase
      .from('listings')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
    if (qVal.trim()) {
      const like = `%${qVal.trim()}%`
      fallback = fallback.or(`city.ilike.${like},state.ilike.${like},airport_name.ilike.${like},airport_code.ilike.${like}`)
    }
    if (typeVal === 'sale' || typeVal === 'lease' || typeVal === 'space') fallback = fallback.eq('listing_type', typeVal)
    if (!isNaN(minP) && minP > 0) fallback = fallback.gte(priceCol, minP)
    if (!isNaN(maxP) && maxP > 0) fallback = fallback.lte(priceCol, maxP)
    if (!isNaN(minSq) && minSq > 0) fallback = fallback.gte('square_feet', minSq)
    const result = await fallback
    listings = result.data
    error = result.error
  }

  if (error) {
    return (
      <div>
        <h1>Hangar Listings</h1>
        <p style={{ color: '#dc2626' }}>
          Error loading listings: <code>{error.message}</code>
        </p>
      </div>
    )
  }

  const now = new Date()

  // ── Tier-aware sort ─────────────────────────────────────────────────────
  // Look up each listing host's current subscription tier and sort:
  //   1. paid tier (pro > featured > free)
  //   2. legacy is_featured (admin-pinned, no subscription)
  //   3. created_at DESC (recency)
  // One batched query for all unique user_ids — fast even with many listings.
  const userIds = Array.from(new Set((listings ?? []).map((l: Listing) => l.user_id).filter(Boolean) as string[]))
  const tierByUserId = new Map<string, number>()
  if (userIds.length > 0) {
    const { data: subs } = await supabase
      .from('host_subscriptions')
      .select('user_id, tier, status')
      .in('user_id', userIds)
    if (subs) {
      for (const s of subs) {
        // Cancelled / grace_period subs revert to free (priority 0). Active /
        // trial subs get their tier's priority. Mirror of the SQL
        // host_tier_priority() function semantics.
        if (s.status === 'cancelled' || s.status === 'grace_period') continue
        const p = s.tier === 'pro' ? 2 : s.tier === 'featured' ? 1 : 0
        if (p > 0) tierByUserId.set(s.user_id, p)
      }
    }
  }

  let safeListings: Listing[] = (listings ?? [])
    .map((l: Listing) => ({
      ...l,
      listing_photos: l.listing_photos ?? [],
      // Stamp the host's tier priority onto the row for downstream sort +
      // card badge rendering.
      _tier_priority: tierByUserId.get(l.user_id ?? '') ?? 0,
    }))
    .sort((a: Listing & { _tier_priority?: number }, b: Listing & { _tier_priority?: number }) => {
      const aTier = a._tier_priority ?? 0
      const bTier = b._tier_priority ?? 0
      if (aTier !== bTier) return bTier - aTier
      const aFeatured = a.is_featured && a.featured_until && new Date(a.featured_until) > now
      const bFeatured = b.is_featured && b.featured_until && new Date(b.featured_until) > now
      if (aFeatured && !bFeatured) return -1
      if (!aFeatured && bFeatured) return 1
      return 0
    })

  // Default aircraft for the "Fits my X" pill on the listings panel.
  // Server-rendered so the pill state lands correctly on first paint.
  const defaultAircraft = await getDefaultAircraft()

  // ── Radius post-filter ───────────────────────────────────────────────────
  if (useRadius && radiusCenter) {
    safeListings = safeListings.filter(l => {
      if (l.latitude == null || l.longitude == null) return false
      return distanceMiles(radiusCenter, { lat: l.latitude, lng: l.longitude }) <= radiusMiles
    })
  }

  return (
    <>
    {/* Negative margin breaks out of the layout's max-width / padding
        so the map can span the full viewport width */}
    <div className="home-fullbleed" style={{ margin: '-2rem', display: 'flex', flexDirection: 'column', height: 'calc(100dvh - var(--header-h, 60px))', overflow: 'hidden' }}>

      {/* Search bar — desktop only; on mobile the floating bar in SplitView is used */}
      <div className="desktop-search-bar" style={{ padding: '1rem 2rem 0.75rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f8f8f8', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <Suspense fallback={<div style={{ height: '60px' }} />}>
          <SearchFilters
            initialQ={qVal}
            initialType={typeVal}
            initialMinPrice={minPriceVal}
            initialMaxPrice={maxPriceVal}
            initialMinSqft={minSqftVal}
            initialRadius={radiusVal}
            initialMinRunway={minRunwayVal}
            initialBrokerOnly={brokerOnlyVal}
          />
        </Suspense>
        <SaveSearchWidget
          query={qVal}
          listingType={typeVal}
          maxPrice={maxPriceVal}
          minSqft={minSqftVal}
        />
      </div>

      {/* Split view fills remaining height — always rendered (handles empty state internally) */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
        <SplitView
          listings={safeListings}
          supabaseUrl={SUPABASE_URL}
          savedIds={savedIds}
          userId={user?.id ?? null}
          aircraft={defaultAircraft ? {
            id:          defaultAircraft.id,
            common_name: defaultAircraft.common_name,
            wingspan_ft: defaultAircraft.wingspan_ft,
            length_ft:   defaultAircraft.length_ft,
            height_ft:   defaultAircraft.height_ft,
          } : null}
          initialQ={qVal}
          initialType={typeVal}
          initialMinPrice={minPriceVal}
          initialMaxPrice={maxPriceVal}
          initialMinSqft={minSqftVal}
          searchQuery={qVal}
        />
      </div>
    </div>

    {/* ── Mobile app coming-soon strip ──────────────────────────────────────
        The home page above is a full-viewport split view (map + listings),
        so on mobile it's `position: fixed` and there's no "below" — this
        section is hidden via the `home-app-coming-soon` class in
        globals.css for that breakpoint. Desktop visitors scroll past the
        map and land here.                                                  */}
    <section
      className="home-app-coming-soon"
      aria-labelledby="home-app-coming-soon-title"
      style={{
        marginTop: '2.5rem',
        padding: '2rem 2.25rem',
        backgroundColor: '#0f172a',
        backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1a3a5c 100%)',
        borderRadius: '14px',
        color: 'white',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 420px)',
        gap: '2rem',
        alignItems: 'center',
      }}
    >
      <div>
        <span style={{
          display: 'inline-block',
          backgroundColor: 'rgba(96, 165, 250, 0.18)',
          color: '#bfdbfe',
          fontSize: '0.68rem',
          fontWeight: '700',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: '0.25rem 0.7rem',
          borderRadius: '9999px',
          marginBottom: '0.85rem',
        }}>
          Coming soon
        </span>
        <h2
          id="home-app-coming-soon-title"
          style={{
            margin: '0 0 0.6rem',
            fontSize: '1.4rem',
            fontWeight: '800',
            lineHeight: 1.25,
            letterSpacing: '-0.01em',
          }}
        >
          Mobile app coming soon — get notified
        </h2>
        <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.925rem', lineHeight: 1.6, maxWidth: '52ch' }}>
          Hangar Marketplace is launching native iOS and Android apps soon.
          Drop your email — we&apos;ll let you know the moment they&apos;re live.
        </p>
      </div>

      <div>
        <PreLaunchSignup source="web-home" variant="compact" />
      </div>
    </section>
    </>
  )
}
