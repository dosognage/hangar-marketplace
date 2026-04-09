import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { createServerClient } from '@/lib/supabase-server'
import SearchFilters from '@/app/components/SearchFilters'
import SplitView from '@/app/components/SplitView'

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

  const safeListings: Listing[] = (listings ?? []).map((l: Listing) => ({
    ...l,
    listing_photos: l.listing_photos ?? [],
  }))

  return (
    // Negative margin breaks out of the layout's max-width / padding
    // so the map can span the full viewport width
    <div style={{ margin: '-2rem', display: 'flex', flexDirection: 'column', height: 'calc(100dvh - var(--header-h, 60px))', overflow: 'hidden' }}>

      {/* Search bar — constrained width, sits above the split */}
      <div style={{ padding: '1rem 2rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f8f8f8' }}>
        <Suspense fallback={<div style={{ height: '60px' }} />}>
          <SearchFilters
            initialQ={qVal}
            initialType={typeVal}
            initialMinPrice={minPriceVal}
            initialMaxPrice={maxPriceVal}
            initialMinSqft={minSqftVal}
          />
        </Suspense>
      </div>

      {/* Split view fills remaining height */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
        {safeListings.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <p style={{ fontSize: '1.1rem', fontWeight: '700', color: '#111827', margin: '0 0 0.4rem' }}>
              No hangars found
            </p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 1.5rem' }}>
              Try a different search or clear the filters.
            </p>
            <a href="/" style={{
              display: 'inline-block', padding: '0.6rem 1.25rem', backgroundColor: '#111827',
              color: 'white', borderRadius: '6px', textDecoration: 'none',
              fontWeight: '600', fontSize: '0.875rem',
            }}>
              Clear all filters
            </a>
          </div>
        ) : (
          <SplitView
            listings={safeListings}
            supabaseUrl={SUPABASE_URL}
            savedIds={savedIds}
            userId={user?.id ?? null}
          />
        )}
      </div>
    </div>
  )
}
