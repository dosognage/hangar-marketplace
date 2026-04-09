import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { slugToState, slugToStateName, STATE_NAMES } from '@/lib/states'
import type { Metadata } from 'next'
import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

type Props = { params: Promise<{ state: string }> }

export async function generateStaticParams() {
  return Object.keys(STATE_NAMES).map(s => ({ state: s }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: slug } = await params
  const stateName = slugToStateName(slug)
  if (!STATE_NAMES[slug]) return { title: 'Not Found' }

  const title = `Airplane Hangars for Sale & Lease in ${stateName} | Hangar Marketplace`
  const description = `Browse aircraft hangars for sale, lease, and rent in ${stateName}. T-hangars, corporate hangars, and shared hangar space at airports across ${stateName}. View photos, dimensions, and pricing.`

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/hangars/${slug}` },
    openGraph: { title, description, type: 'website', url: `${SITE_URL}/hangars/${slug}` },
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

function typeColor(t: string): string {
  if (t === 'sale') return '#166534'
  if (t === 'space') return '#1e40af'
  return '#92400e'
}
function typeBg(t: string): string {
  if (t === 'sale') return '#dcfce7'
  if (t === 'space') return '#dbeafe'
  return '#fef3c7'
}

export default async function StateHangarsPage({ params }: Props) {
  const { state: slug } = await params
  const stateName = slugToStateName(slug)

  if (!STATE_NAMES[slug]) notFound()

  const stateDb = slugToState(slug)

  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, airport_name, airport_code, city, state, listing_type, asking_price, monthly_lease, square_feet, door_width, door_height, listing_photos(storage_path, display_order)')
    .eq('status', 'approved')
    .ilike('state', stateDb)
    .order('created_at', { ascending: false })

  const typedListings = (listings ?? []) as Listing[]

  // Group by airport for display
  const byAirport = typedListings.reduce<Record<string, Listing[]>>((acc, l) => {
    const key = `${l.airport_code} — ${l.airport_name}`
    if (!acc[key]) acc[key] = []
    acc[key].push(l)
    return acc
  }, {})

  const airports = Object.keys(byAirport).sort()

  const forSale = typedListings.filter(l => l.listing_type === 'sale').length
  const forLease = typedListings.filter(l => l.listing_type !== 'sale').length

  // JSON-LD breadcrumb
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Browse Hangars', item: SITE_URL },
      { '@type': 'ListItem', position: 3, name: `${stateName} Hangars`, item: `${SITE_URL}/hangars/${slug}` },
    ],
  }

  return (
    <div style={{ maxWidth: '960px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      {/* Breadcrumb */}
      <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#6b7280' }}>
        <Link href="/" style={{ color: '#6366f1', textDecoration: 'none' }}>Browse</Link>
        {' → '}
        <span>{stateName}</span>
      </p>

      {/* Hero */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.75rem', color: '#111827' }}>
          Airplane Hangars in {stateName}
        </h1>
        <p style={{ margin: '0 0 1rem', color: '#6b7280', fontSize: '1rem', lineHeight: 1.6 }}>
          {typedListings.length > 0
            ? `${typedListings.length} hangar${typedListings.length !== 1 ? 's' : ''} available across ${airports.length} airport${airports.length !== 1 ? 's' : ''} in ${stateName}.${forSale ? ` ${forSale} for sale.` : ''}${forLease ? ` ${forLease} for lease or rent.` : ''}`
            : `No hangars currently listed in ${stateName} — check back soon or post a hangar request to let owners know you're looking.`
          }
        </p>

        {/* Quick stats */}
        {typedListings.length > 0 && (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Total listings', value: typedListings.length },
              { label: 'Airports', value: airports.length },
              { label: 'For sale', value: forSale },
              { label: 'For lease/rent', value: forLease },
            ].map(s => (
              <div key={s.label} style={{
                padding: '0.6rem 1rem', backgroundColor: 'white',
                border: '1px solid #e5e7eb', borderRadius: '8px', textAlign: 'center',
              }}>
                <div style={{ fontWeight: '800', fontSize: '1.25rem', color: '#111827' }}>{s.value}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Listings */}
      {typedListings.length === 0 ? (
        <div style={{
          backgroundColor: 'white', border: '1px dashed #d1d5db',
          borderRadius: '12px', padding: '3rem 2rem', textAlign: 'center',
        }}>
          <p style={{ fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>No listings in {stateName} yet</p>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
            Be the first to list a hangar here, or post a request so owners know you&apos;re looking.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/submit" style={{ padding: '0.6rem 1.25rem', backgroundColor: '#111827', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '0.875rem' }}>
              List a hangar →
            </Link>
            <Link href="/requests/new" style={{ padding: '0.6rem 1.25rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '0.875rem' }}>
              Post a request →
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '2rem' }}>
          {airports.map(airport => (
            <div key={airport}>
              <h2 style={{ margin: '0 0 0.875rem', fontSize: '1.05rem', color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
                {airport}
              </h2>
              <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {byAirport[airport].map(listing => {
                  const photos = [...(listing.listing_photos ?? [])].sort((a, b) => a.display_order - b.display_order)
                  const thumb = photos[0] ? photoUrl(photos[0].storage_path) : null

                  return (
                    <Link
                      key={listing.id}
                      href={`/listing/${listing.id}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <div className="hover-card" style={{
                        backgroundColor: 'white', border: '1px solid #e5e7eb',
                        borderRadius: '10px', overflow: 'hidden',
                      }}>
                        {thumb && (
                          <div style={{ height: '160px', overflow: 'hidden', backgroundColor: '#f3f4f6' }}>
                            <img src={thumb} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}
                        <div style={{ padding: '0.875rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                            <span style={{
                              padding: '0.1rem 0.5rem', borderRadius: '999px',
                              fontSize: '0.7rem', fontWeight: '700',
                              backgroundColor: typeBg(listing.listing_type),
                              color: typeColor(listing.listing_type),
                            }}>
                              {typeLabel(listing.listing_type)}
                            </span>
                          </div>
                          <h3 style={{ margin: '0 0 0.25rem', fontSize: '0.9rem', color: '#111827', fontWeight: '700' }}>
                            {listing.title}
                          </h3>
                          <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#6b7280' }}>
                            {listing.city}
                            {listing.square_feet ? ` · ${listing.square_feet.toLocaleString()} sq ft` : ''}
                          </p>
                          <p style={{ margin: 0, fontWeight: '700', fontSize: '0.95rem', color: '#2563eb' }}>
                            {priceLabel(listing)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cross-link to other pages */}
      <div style={{ marginTop: '3rem', padding: '1.5rem', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: '#111827' }}>Looking for hangar space in {stateName}?</h2>
        <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.6 }}>
          Post a free hangar request to let owners at {stateName} airports know you&apos;re looking — they&apos;ll reach out when space opens up.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/requests/new" style={{ padding: '0.5rem 1rem', backgroundColor: '#111827', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '0.825rem' }}>
            Post a hangar request →
          </Link>
          <Link href="/" style={{ padding: '0.5rem 1rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '0.825rem' }}>
            Browse all states →
          </Link>
        </div>
      </div>
    </div>
  )
}
