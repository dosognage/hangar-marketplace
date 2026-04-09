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
  description: string | null
  contact_name: string
  latitude: number | null
  longitude: number | null
  is_featured: boolean
  featured_until: string | null
  is_sponsored: boolean
  sponsored_until: string | null
  is_sample: boolean
  listing_photos: Photo[]
}

type HomePageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

export default async function HomePage({ searchParams }: HomePageProps) {
  const { q, type, minPrice, maxPrice, minSqft } = await searchParams

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

  const qVal        = str(q)
  const typeVal     = str(type)
  const minPriceVal = str(minPrice)
  const maxPriceVal = str(maxPrice)
  const minSqftVal  = str(minSqft)

  // ── Build query ─────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('listings')
    .select('*, listing_photos(storage_path, display_order)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  if (qVal.trim()) {
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
  const safeListings: Listing[] = (listings ?? [])
    .map((l: Listing) => ({ ...l, listing_photos: l.listing_photos ?? [] }))
    .sort((a: Listing, b: Listing) => {
      const aFeatured = a.is_featured && a.featured_until && new Date(a.featured_until) > now
      const bFeatured = b.is_featured && b.featured_until && new Date(b.featured_until) > now
      if (aFeatured && !bFeatured) return -1
      if (!aFeatured && bFeatured) return 1
      return 0
    })

  return (
    // Negative margin breaks out of the layout's max-width / padding
    // so the map can span the full viewport width
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
          initialQ={qVal}
          initialType={typeVal}
          initialMinPrice={minPriceVal}
          initialMaxPrice={maxPriceVal}
          initialMinSqft={minSqftVal}
        />
      </div>
    </div>
  )
}
