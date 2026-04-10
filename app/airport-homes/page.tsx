export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export const metadata: Metadata = {
  title: 'Airport Homes & Land For Sale or Lease | Hangar Marketplace',
  description: 'Browse airport homes, residential airpark properties, and aviation land for sale or lease. Find your dream fly-in community home on Hangar Marketplace.',
}

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

type AirportHomeListing = {
  id: string
  title: string
  city: string
  state: string
  airport_name: string
  airport_code: string
  property_type: 'airport_home' | 'land' | 'fly_in_community'
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
  airport_home:    'Airport Home',
  land:            'Land / Lot',
  fly_in_community: 'Fly-in Community',
}

const PROPERTY_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  airport_home:    { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
  land:            { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  fly_in_community: { bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff' },
}

const US_STATES = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
  ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],
  ['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],
  ['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],
  ['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],
  ['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],
  ['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],
  ['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],
  ['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],
  ['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
]

function formatPrice(listing: AirportHomeListing) {
  if (listing.listing_type === 'sale' && listing.asking_price) {
    return `$${listing.asking_price.toLocaleString()}`
  }
  if (listing.monthly_lease) {
    return `$${listing.monthly_lease.toLocaleString()}/mo`
  }
  return 'Contact for price'
}

export default async function AirportHomesPage({ searchParams }: PageProps) {
  const { q, state, type } = await searchParams
  const qVal     = (Array.isArray(q)     ? q[0]     : q     ?? '').trim()
  const stateVal = (Array.isArray(state) ? state[0] : state ?? '').trim().toUpperCase()
  const typeVal  = (Array.isArray(type)  ? type[0]  : type  ?? '').trim()

  let query = supabase
    .from('listings')
    .select('id, title, city, state, airport_name, airport_code, property_type, listing_type, asking_price, monthly_lease, bedrooms, bathrooms, home_sqft, lot_acres, has_runway_access, airpark_name, listing_photos(storage_path, display_order)')
    .in('property_type', ['airport_home', 'land', 'fly_in_community'])
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  if (stateVal) query = query.eq('state', stateVal)
  if (typeVal)  query = query.eq('property_type', typeVal)

  const { data } = await query
  let listings = (data ?? []) as AirportHomeListing[]

  if (qVal) {
    const lower = qVal.toLowerCase()
    listings = listings.filter(l =>
      l.title.toLowerCase().includes(lower) ||
      l.city.toLowerCase().includes(lower) ||
      l.airport_name.toLowerCase().includes(lower) ||
      (l.airpark_name ?? '').toLowerCase().includes(lower)
    )
  }

  const totalCount = listings.length

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.4rem', fontSize: '1.75rem' }}>Airport Homes &amp; Land</h1>
        <p style={{ margin: 0, color: '#6b7280', lineHeight: 1.6 }}>
          Residential homes, lots, and fly-in community properties at airports across the US.
          Find a home where you can park your plane in the hangar and walk to the runway.
        </p>
      </div>

      {/* Property type pills */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {[
          { val: '', label: 'All types' },
          { val: 'airport_home', label: 'Airport Homes' },
          { val: 'land', label: 'Land / Lots' },
          { val: 'fly_in_community', label: 'Fly-in Communities' },
        ].map(({ val, label }) => {
          const active = typeVal === val
          const params = new URLSearchParams()
          if (qVal) params.set('q', qVal)
          if (stateVal) params.set('state', stateVal)
          if (val) params.set('type', val)
          return (
            <a
              key={val}
              href={`/airport-homes${params.toString() ? `?${params}` : ''}`}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '999px',
                fontSize: '0.85rem',
                fontWeight: active ? '700' : '500',
                textDecoration: 'none',
                border: `1.5px solid ${active ? '#6366f1' : '#e5e7eb'}`,
                backgroundColor: active ? '#6366f1' : 'white',
                color: active ? 'white' : '#374151',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </a>
          )
        })}
      </div>

      {/* Search + state filter */}
      <form method="GET" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {typeVal && <input type="hidden" name="type" value={typeVal} />}
        <input
          name="q"
          defaultValue={qVal}
          placeholder="Search by city, airport, or community…"
          style={{
            flex: '1 1 240px', padding: '0.6rem 0.9rem',
            border: '1px solid #d1d5db', borderRadius: '8px',
            fontSize: '0.9rem', backgroundColor: 'white',
          }}
        />
        <select
          name="state"
          defaultValue={stateVal}
          style={{
            padding: '0.6rem 0.9rem', border: '1px solid #d1d5db',
            borderRadius: '8px', fontSize: '0.9rem',
            backgroundColor: 'white', minWidth: '160px',
            color: stateVal ? '#111827' : '#6b7280',
          }}
        >
          <option value="">All states</option>
          {US_STATES.map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
        <button
          type="submit"
          style={{
            padding: '0.6rem 1.25rem', backgroundColor: '#111827',
            color: 'white', border: 'none', borderRadius: '8px',
            fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer',
          }}
        >
          Search
        </button>
        {(qVal || stateVal || typeVal) && (
          <a href="/airport-homes" style={{
            padding: '0.6rem 1rem', color: '#6b7280',
            border: '1px solid #e5e7eb', borderRadius: '8px',
            fontSize: '0.875rem', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center',
          }}>
            Clear
          </a>
        )}
      </form>

      {/* Result count */}
      <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: '#6b7280' }}>
        {totalCount === 0
          ? 'No properties found.'
          : `${totalCount} propert${totalCount !== 1 ? 'ies' : 'y'}${stateVal ? ` in ${stateVal}` : ''}`}
      </p>

      {/* Listings grid */}
      {listings.length === 0 ? (
        <div style={{
          backgroundColor: 'white', border: '1px dashed #d1d5db',
          borderRadius: '12px', padding: '4rem 2rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏡</div>
          <p style={{ margin: '0 0 0.5rem', fontWeight: '700', color: '#111827' }}>
            No properties found
          </p>
          <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: '#6b7280' }}>
            Try a different state or clear the filters. Be the first to list your airport property!
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/airport-homes" style={{
              display: 'inline-block', padding: '0.55rem 1.25rem',
              backgroundColor: '#111827', color: 'white',
              borderRadius: '6px', textDecoration: 'none',
              fontWeight: '600', fontSize: '0.875rem',
            }}>
              See all properties
            </a>
            <a href="/submit" style={{
              display: 'inline-block', padding: '0.55rem 1.25rem',
              backgroundColor: '#6366f1', color: 'white',
              borderRadius: '6px', textDecoration: 'none',
              fontWeight: '600', fontSize: '0.875rem',
            }}>
              List your property
            </a>
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
              <Link
                key={listing.id}
                href={`/listing/${listing.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  className="hover-card"
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    transition: 'box-shadow 0.15s, border-color 0.15s',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Photo */}
                  <div style={{
                    width: '100%', height: '190px',
                    backgroundColor: '#f3f4f6',
                    position: 'relative', overflow: 'hidden',
                    flexShrink: 0,
                  }}>
                    {heroPhoto ? (
                      <img
                        src={heroPhoto}
                        alt={listing.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2.5rem', color: '#d1d5db',
                      }}>🏡</div>
                    )}
                    {/* Type badge */}
                    <span style={{
                      position: 'absolute', top: '0.6rem', left: '0.6rem',
                      padding: '0.2rem 0.6rem', borderRadius: '999px',
                      fontSize: '0.7rem', fontWeight: '700',
                      backgroundColor: typeColors.bg, color: typeColors.text,
                      border: `1px solid ${typeColors.border}`,
                    }}>
                      {typeLabel}
                    </span>
                    {/* For Sale / Lease badge */}
                    <span style={{
                      position: 'absolute', top: '0.6rem', right: '0.6rem',
                      padding: '0.2rem 0.6rem', borderRadius: '999px',
                      fontSize: '0.7rem', fontWeight: '700',
                      backgroundColor: 'rgba(0,0,0,0.55)', color: 'white',
                    }}>
                      {listingLabel}
                    </span>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.2rem', fontSize: '0.95rem', fontWeight: '700', color: '#111827', lineHeight: 1.3 }}>
                        {listing.title}
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
                        {listing.airport_name} ({listing.airport_code}) · {listing.city}, {listing.state}
                      </p>
                      {listing.airpark_name && (
                        <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#8b5cf6', fontWeight: '600' }}>
                          {listing.airpark_name}
                        </p>
                      )}
                    </div>

                    {/* Specs row */}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.78rem', color: '#6b7280' }}>
                      {listing.bedrooms != null && (
                        <span>🛏 {listing.bedrooms} bed</span>
                      )}
                      {listing.bathrooms != null && (
                        <span>🚿 {listing.bathrooms} bath</span>
                      )}
                      {listing.home_sqft != null && (
                        <span>📐 {listing.home_sqft.toLocaleString()} sq ft</span>
                      )}
                      {listing.lot_acres != null && (
                        <span>🌿 {listing.lot_acres} acres</span>
                      )}
                      {listing.has_runway_access && (
                        <span style={{ color: '#059669', fontWeight: '600' }}>✈ Runway access</span>
                      )}
                    </div>

                    {/* Price */}
                    <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid #f3f4f6' }}>
                      <span style={{ fontSize: '1rem', fontWeight: '700', color: '#111827' }}>
                        {formatPrice(listing)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Browse by state */}
      <div style={{ marginTop: '3rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0 0 1rem', color: '#111827' }}>
          Browse by state
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {US_STATES.map(([code, name]) => (
            <a
              key={code}
              href={`/airport-homes/${code.toLowerCase()}`}
              style={{
                padding: '0.35rem 0.8rem',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '0.8rem',
                color: '#374151',
                textDecoration: 'none',
                fontWeight: '500',
              }}
            >
              {name}
            </a>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{
        marginTop: '3rem', backgroundColor: '#f8fafc',
        border: '1px solid #e5e7eb', borderRadius: '12px',
        padding: '1.75rem 2rem', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '1rem',
      }}>
        <div>
          <p style={{ margin: '0 0 0.2rem', fontWeight: '700', fontSize: '0.95rem', color: '#111827' }}>
            Selling or leasing an airport property?
          </p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
            List your airport home, land, or fly-in community property and reach serious aviation buyers.
          </p>
        </div>
        <Link href="/submit" style={{
          display: 'inline-block', padding: '0.6rem 1.25rem',
          backgroundColor: '#6366f1', color: 'white',
          borderRadius: '8px', textDecoration: 'none',
          fontWeight: '700', fontSize: '0.875rem', whiteSpace: 'nowrap',
        }}>
          List your property
        </Link>
      </div>

    </div>
  )
}
