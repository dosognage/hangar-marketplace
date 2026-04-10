export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'

type PageProps = {
  params: Promise<{ state: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const STATE_NAMES: Record<string, string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
  CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',
  HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',
  KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',
  MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',
  MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
  NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',
  OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',
  VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
}

type AirportHomeListing = {
  id: string
  title: string
  city: string
  state: string
  airport_name: string
  airport_code: string
  property_type: string
  listing_type: string
  asking_price: number | null
  monthly_lease: number | null
  bedrooms: number | null
  bathrooms: number | null
  home_sqft: number | null
  lot_acres: number | null
  has_runway_access: boolean | null
  airpark_name: string | null
  listing_photos: { storage_path: string; display_order: number }[]
}

const SUPABASE_STORAGE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-photos`

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  airport_home:     'Airport Home',
  land:             'Land / Lot',
  fly_in_community: 'Fly-in Community',
}

const PROPERTY_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  airport_home:    { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
  land:            { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  fly_in_community: { bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff' },
}

function formatPrice(listing: AirportHomeListing) {
  if (listing.listing_type === 'sale' && listing.asking_price) {
    return `$${listing.asking_price.toLocaleString()}`
  }
  if (listing.monthly_lease) {
    return `$${listing.monthly_lease.toLocaleString()}/mo`
  }
  return 'Contact for price'
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { state } = await params
  const stateCode = state.toUpperCase()
  const stateName = STATE_NAMES[stateCode]
  if (!stateName) return { title: 'Not Found' }
  return {
    title: `Airport Homes & Land in ${stateName} | Hangar Marketplace`,
    description: `Browse airport homes, fly-in community properties, and aviation land for sale or lease in ${stateName}.`,
  }
}

export default async function AirportHomesStatePage({ params, searchParams }: PageProps) {
  const { state } = await params
  const { type } = await searchParams
  const stateCode = state.toUpperCase()
  const stateName = STATE_NAMES[stateCode]
  const typeVal   = (Array.isArray(type) ? type[0] : type ?? '').trim()

  if (!stateName) notFound()

  let query = supabase
    .from('listings')
    .select('id, title, city, state, airport_name, airport_code, property_type, listing_type, asking_price, monthly_lease, bedrooms, bathrooms, home_sqft, lot_acres, has_runway_access, airpark_name, listing_photos(storage_path, display_order)')
    .in('property_type', ['airport_home', 'land', 'fly_in_community'])
    .eq('status', 'approved')
    .eq('state', stateCode)
    .order('created_at', { ascending: false })

  if (typeVal) query = query.eq('property_type', typeVal)

  const { data } = await query
  const listings = (data ?? []) as AirportHomeListing[]

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
        <Link href="/airport-homes" style={{ color: '#6366f1', textDecoration: 'none' }}>Airport Homes</Link>
        {' '} / {stateName}
      </div>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.4rem', fontSize: '1.75rem' }}>
          Airport Homes &amp; Land in {stateName}
        </h1>
        <p style={{ margin: 0, color: '#6b7280', lineHeight: 1.6 }}>
          {listings.length > 0
            ? `${listings.length} propert${listings.length !== 1 ? 'ies' : 'y'} available in ${stateName}.`
            : `No properties currently listed in ${stateName}.`}
          {' '}Find your next fly-in home or aviation land parcel.
        </p>
      </div>

      {/* Type filter pills */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {[
          { val: '', label: 'All types' },
          { val: 'airport_home', label: 'Airport Homes' },
          { val: 'land', label: 'Land / Lots' },
          { val: 'fly_in_community', label: 'Fly-in Communities' },
        ].map(({ val, label }) => {
          const active = typeVal === val
          const href = val
            ? `/airport-homes/${state.toLowerCase()}?type=${val}`
            : `/airport-homes/${state.toLowerCase()}`
          return (
            <a key={val} href={href} style={{
              padding: '0.4rem 1rem', borderRadius: '999px',
              fontSize: '0.85rem', fontWeight: active ? '700' : '500',
              textDecoration: 'none',
              border: `1.5px solid ${active ? '#6366f1' : '#e5e7eb'}`,
              backgroundColor: active ? '#6366f1' : 'white',
              color: active ? 'white' : '#374151',
            }}>
              {label}
            </a>
          )
        })}
      </div>

      {listings.length === 0 ? (
        <div style={{
          backgroundColor: 'white', border: '1px dashed #d1d5db',
          borderRadius: '12px', padding: '4rem 2rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏡</div>
          <p style={{ margin: '0 0 0.5rem', fontWeight: '700', color: '#111827' }}>
            No properties in {stateName} yet
          </p>
          <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: '#6b7280' }}>
            Be the first to list an airport property here, or browse all states.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/airport-homes" style={{
              display: 'inline-block', padding: '0.55rem 1.25rem',
              backgroundColor: '#111827', color: 'white',
              borderRadius: '6px', textDecoration: 'none',
              fontWeight: '600', fontSize: '0.875rem',
            }}>
              Browse all states
            </Link>
            <Link href="/submit" style={{
              display: 'inline-block', padding: '0.55rem 1.25rem',
              backgroundColor: '#6366f1', color: 'white',
              borderRadius: '6px', textDecoration: 'none',
              fontWeight: '600', fontSize: '0.875rem',
            }}>
              List your property
            </Link>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.25rem',
        }}>
          {listings.map(listing => {
            const typeColors = PROPERTY_TYPE_COLORS[listing.property_type] ?? PROPERTY_TYPE_COLORS.airport_home
            const typeLabel  = PROPERTY_TYPE_LABELS[listing.property_type] ?? listing.property_type
            const sortedPhotos = [...(listing.listing_photos ?? [])].sort((a, b) => a.display_order - b.display_order)
            const heroPhoto = sortedPhotos[0]
              ? `${SUPABASE_STORAGE}/${sortedPhotos[0].storage_path}`
              : null
            const listingLabel =
              listing.listing_type === 'sale'  ? 'For Sale' :
              listing.listing_type === 'lease' ? 'For Lease' : 'For Sale / Lease'

            return (
              <Link key={listing.id} href={`/listing/${listing.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="hover-card" style={{
                  backgroundColor: 'white', border: '1px solid #e5e7eb',
                  borderRadius: '12px', overflow: 'hidden',
                  transition: 'box-shadow 0.15s, border-color 0.15s',
                  display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{ width: '100%', height: '190px', backgroundColor: '#f3f4f6', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                    {heroPhoto
                      ? <img src={heroPhoto} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', color: '#d1d5db' }}>🏡</div>
                    }
                    <span style={{ position: 'absolute', top: '0.6rem', left: '0.6rem', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '700', backgroundColor: typeColors.bg, color: typeColors.text, border: `1px solid ${typeColors.border}` }}>
                      {typeLabel}
                    </span>
                    <span style={{ position: 'absolute', top: '0.6rem', right: '0.6rem', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.55)', color: 'white' }}>
                      {listingLabel}
                    </span>
                  </div>
                  <div style={{ padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.2rem', fontSize: '0.95rem', fontWeight: '700', color: '#111827', lineHeight: 1.3 }}>{listing.title}</h3>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
                        {listing.airport_name} ({listing.airport_code}) · {listing.city}
                      </p>
                      {listing.airpark_name && (
                        <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#8b5cf6', fontWeight: '600' }}>{listing.airpark_name}</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.78rem', color: '#6b7280' }}>
                      {listing.bedrooms != null && <span>🛏 {listing.bedrooms} bed</span>}
                      {listing.bathrooms != null && <span>🚿 {listing.bathrooms} bath</span>}
                      {listing.home_sqft != null && <span>📐 {listing.home_sqft.toLocaleString()} sq ft</span>}
                      {listing.lot_acres != null && <span>🌿 {listing.lot_acres} acres</span>}
                      {listing.has_runway_access && <span style={{ color: '#059669', fontWeight: '600' }}>✈ Runway access</span>}
                    </div>
                    <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid #f3f4f6' }}>
                      <span style={{ fontSize: '1rem', fontWeight: '700', color: '#111827' }}>{formatPrice(listing)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
        <Link href="/airport-homes" style={{ color: '#6366f1', textDecoration: 'none', fontSize: '0.875rem', fontWeight: '600' }}>
          ← Browse all states
        </Link>
      </div>

    </div>
  )
}
