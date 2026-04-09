import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { stateToSlug } from '@/lib/states'
import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

type Props = { params: Promise<{ icao: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { icao } = await params
  const code = icao.toUpperCase()

  const { data: sample } = await supabase
    .from('listings')
    .select('airport_name, city, state')
    .eq('status', 'approved')
    .ilike('airport_code', code)
    .limit(1)
    .single()

  const airportName = sample?.airport_name ?? `${code} Airport`
  const location = sample ? `${sample.city}, ${sample.state}` : 'United States'

  const title = `Hangars at ${airportName} (${code}) — For Sale & Lease | Hangar Marketplace`
  const description = `Browse aircraft hangars for sale, lease, and rent at ${airportName} (${code}) in ${location}. T-hangars, box hangars, and shared hangar space. View photos and contact owners directly.`

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/hangars/airport/${icao.toLowerCase()}` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${SITE_URL}/hangars/airport/${icao.toLowerCase()}`,
    },
  }
}

type Listing = {
  id: string
  title: string
  airport_name: string
  airport_code: string
  city: string
  state: string
  listing_type: string
  asking_price: number | null
  monthly_lease: number | null
  square_feet: number | null
  door_width: number | null
  door_height: number | null
  description: string | null
  listing_photos: Array<{ storage_path: string; display_order: number }>
}

function photoUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/listing-photos/${path}`
}

function priceLabel(l: Listing) {
  if (l.asking_price) return `$${l.asking_price.toLocaleString()}`
  if (l.monthly_lease) return `$${l.monthly_lease.toLocaleString()}/mo`
  return 'Contact for price'
}

function typeLabel(t: string) {
  if (t === 'sale') return 'For Sale'
  if (t === 'space') return 'Space Available'
  return 'For Lease'
}

export default async function AirportHangarsPage({ params }: Props) {
  const { icao } = await params
  const code = icao.toUpperCase()

  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, airport_name, airport_code, city, state, listing_type, asking_price, monthly_lease, square_feet, door_width, door_height, description, listing_photos(storage_path, display_order)')
    .eq('status', 'approved')
    .ilike('airport_code', code)
    .order('created_at', { ascending: false })

  const typedListings = (listings ?? []) as Listing[]

  if (typedListings.length === 0) {
    // Page exists but no listings — show CTA rather than 404
    const airportName = `${code} Airport`
    return (
      <div style={{ maxWidth: '700px', margin: '3rem auto', textAlign: 'center', padding: '0 1rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Hangars at {airportName} ({code})</h1>
        <p style={{ color: '#6b7280', marginBottom: '2rem', lineHeight: 1.6 }}>
          No hangars are currently listed at {code}. If you have hangar space here, list it free — or post a request to let owners know you&apos;re looking.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/submit" style={{ padding: '0.65rem 1.35rem', backgroundColor: '#111827', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem' }}>
            List a hangar at {code} →
          </Link>
          <Link href="/requests/new" style={{ padding: '0.65rem 1.35rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem' }}>
            Post a hangar request
          </Link>
        </div>
        <p style={{ marginTop: '2rem' }}>
          <Link href="/" style={{ color: '#6366f1', textDecoration: 'none', fontSize: '0.875rem' }}>
            ← Browse all listings
          </Link>
        </p>
      </div>
    )
  }

  const airportName = typedListings[0].airport_name
  const city = typedListings[0].city
  const state = typedListings[0].state
  const stateSlug = stateToSlug(state)

  const forSale = typedListings.filter(l => l.listing_type === 'sale').length
  const forLease = typedListings.filter(l => l.listing_type !== 'sale').length

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: `${state} Hangars`, item: `${SITE_URL}/hangars/${stateSlug}` },
      { '@type': 'ListItem', position: 3, name: `${code} Hangars`, item: `${SITE_URL}/hangars/airport/${icao.toLowerCase()}` },
    ],
  }

  return (
    <div style={{ maxWidth: '960px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      {/* Breadcrumb */}
      <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#6b7280' }}>
        <Link href="/" style={{ color: '#6366f1', textDecoration: 'none' }}>Browse</Link>
        {' → '}
        <Link href={`/hangars/${stateSlug}`} style={{ color: '#6366f1', textDecoration: 'none' }}>{state}</Link>
        {' → '}
        <span>{code}</span>
      </p>

      {/* Hero */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.4rem', fontSize: '1.75rem', color: '#111827' }}>
          Hangars at {airportName} ({code})
        </h1>
        <p style={{ margin: '0 0 1rem', color: '#6b7280' }}>
          {city}, {state}
        </p>
        <p style={{ margin: '0 0 1.25rem', color: '#374151', fontSize: '0.95rem', lineHeight: 1.6 }}>
          {typedListings.length} hangar{typedListings.length !== 1 ? 's' : ''} available at {code}.
          {forSale ? ` ${forSale} for sale.` : ''}
          {forLease ? ` ${forLease} for lease or rent.` : ''}
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href={`/?q=${code}`} style={{
            padding: '0.5rem 1rem', backgroundColor: '#6366f1', color: 'white',
            borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '0.825rem',
          }}>
            View on map →
          </Link>
          <Link href="/requests/new" style={{
            padding: '0.5rem 1rem', backgroundColor: 'white', color: '#374151',
            border: '1px solid #d1d5db', borderRadius: '6px', textDecoration: 'none',
            fontWeight: '600', fontSize: '0.825rem',
          }}>
            Post a request at {code}
          </Link>
        </div>
      </div>

      {/* Listing grid */}
      <div style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {typedListings.map(listing => {
          const photos = [...(listing.listing_photos ?? [])].sort((a, b) => a.display_order - b.display_order)
          const thumb = photos[0] ? photoUrl(photos[0].storage_path) : null

          return (
            <Link key={listing.id} href={`/listing/${listing.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="hover-card" style={{
                backgroundColor: 'white', border: '1px solid #e5e7eb',
                borderRadius: '10px', overflow: 'hidden', height: '100%',
              }}>
                {thumb ? (
                  <div style={{ height: '180px', overflow: 'hidden', backgroundColor: '#f3f4f6' }}>
                    <img src={thumb} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{ height: '120px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#d1d5db', fontSize: '2rem' }}>✈</span>
                  </div>
                )}
                <div style={{ padding: '1rem' }}>
                  <div style={{ marginBottom: '0.4rem' }}>
                    <span style={{
                      padding: '0.1rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '700',
                      backgroundColor: listing.listing_type === 'sale' ? '#dcfce7' : '#fef3c7',
                      color: listing.listing_type === 'sale' ? '#166534' : '#92400e',
                    }}>
                      {typeLabel(listing.listing_type)}
                    </span>
                  </div>
                  <h2 style={{ margin: '0 0 0.3rem', fontSize: '0.95rem', color: '#111827', fontWeight: '700' }}>
                    {listing.title}
                  </h2>
                  {(listing.square_feet || listing.door_width) && (
                    <p style={{ margin: '0 0 0.4rem', fontSize: '0.8rem', color: '#6b7280' }}>
                      {listing.square_feet ? `${listing.square_feet.toLocaleString()} sq ft` : ''}
                      {listing.door_width && listing.square_feet ? ' · ' : ''}
                      {listing.door_width ? `${listing.door_width}′W door` : ''}
                    </p>
                  )}
                  <p style={{ margin: 0, fontWeight: '700', fontSize: '1rem', color: '#2563eb' }}>
                    {priceLabel(listing)}
                  </p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* State cross-link */}
      <div style={{ marginTop: '2.5rem', padding: '1.25rem 1.5rem', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
        <p style={{ margin: '0 0 0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#111827' }}>
          Looking for more hangars in {state}?
        </p>
        <Link href={`/hangars/${stateSlug}`} style={{ color: '#6366f1', textDecoration: 'none', fontSize: '0.875rem', fontWeight: '500' }}>
          Browse all {state} hangar listings →
        </Link>
      </div>
    </div>
  )
}
