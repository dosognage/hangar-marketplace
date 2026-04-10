export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import HomesSplitView, { type HomeListing } from '@/app/components/HomesSplitView'

export const metadata: Metadata = {
  title: 'Airport Homes & Land For Sale or Lease | Hangar Marketplace',
  description: 'Browse airport homes, residential airpark properties, and aviation land for sale or lease. Find your dream fly-in community home on Hangar Marketplace.',
}

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

export default async function AirportHomesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const str = (v: typeof params[string]) => (Array.isArray(v) ? v[0] : v ?? '').trim()

  const qVal           = str(params.q)
  const stateVal       = str(params.state).toUpperCase()
  const typeVal        = str(params.type)
  const listingTypeVal = str(params.listing_type)

  let query = supabase
    .from('listings')
    .select(`
      id, title, city, state,
      airport_name, airport_code,
      property_type, listing_type,
      asking_price, monthly_lease,
      bedrooms, bathrooms, home_sqft, lot_acres,
      has_runway_access, airpark_name,
      latitude, longitude,
      is_sample,
      listing_photos(storage_path, display_order)
    `)
    .in('property_type', ['airport_home', 'land', 'fly_in_community'])
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  if (stateVal)       query = query.eq('state', stateVal)
  if (typeVal)        query = query.eq('property_type', typeVal)
  if (listingTypeVal) query = query.eq('listing_type', listingTypeVal)

  const { data } = await query
  let listings = (data ?? []) as HomeListing[]

  if (qVal) {
    const lower = qVal.toLowerCase()
    listings = listings.filter(l =>
      l.title.toLowerCase().includes(lower) ||
      l.city.toLowerCase().includes(lower) ||
      l.airport_name.toLowerCase().includes(lower) ||
      (l.airpark_name ?? '').toLowerCase().includes(lower)
    )
  }

  return (
    // Break out of the layout's max-width/padding so the map fills the viewport
    <div
      className="home-fullbleed"
      style={{
        margin: '-2rem',
        height: 'calc(100dvh - var(--header-h, 60px))',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <HomesSplitView
        listings={listings}
        supabaseUrl={SUPABASE_URL}
        initialQ={qVal}
        initialType={typeVal}
        initialState={stateVal}
        initialListingType={listingTypeVal}
      />
    </div>
  )
}
