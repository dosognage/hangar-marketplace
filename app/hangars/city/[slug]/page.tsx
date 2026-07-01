import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { allCitySlugs, getCityBySlug, cityMatchNames, type CityEntry } from '@/lib/cities'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return allCitySlugs().map(slug => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const entry = getCityBySlug(slug)
  if (!entry) return { title: 'Not Found' }

  const title = `Airplane Hangars for Sale & Lease in ${entry.city}, ${entry.state} | Hangar Marketplace`
  const description = `Browse aircraft hangars for sale, lease, and rent in ${entry.city}, ${entry.stateName}. ${entry.metroDesc} View photos, dimensions, and pricing.`

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/hangars/city/${slug}` },
    openGraph:  { title, description, type: 'website', url: `${SITE_URL}/hangars/city/${slug}` },
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
  asking_price:  number | null
  monthly_lease: number | null
  square_feet:   number | null
  door_width:    number | null
  door_height:   number | null
  listing_photos: Array<{ storage_path: string; display_order: number }>
}

function photoUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/listing-photos/${path}`
}

function priceLabel(l: Listing) {
  if (l.asking_price)  return `$${l.asking_price.toLocaleString()}`
  if (l.monthly_lease) return `$${l.monthly_lease.toLocaleString()}/mo`
  return 'Contact for price'
}

function typeLabel(t: string) {
  if (t === 'sale')  return 'For Sale'
  if (t === 'space') return 'Space Available'
  return 'For Lease'
}
function typeColor(t: string): string { return t === 'sale' ? '#166534' : t === 'space' ? '#1e40af' : '#92400e' }
function typeBg(t: string):    string { return t === 'sale' ? '#dcfce7' : t === 'space' ? '#dbeafe' : '#fef3c7' }

async function loadCityListings(entry: CityEntry): Promise<Listing[]> {
  const names = cityMatchNames(entry)
  // We match on the STATE first (indexed, low cardinality) and then
  // filter cities client-side. Postgres ilike with an .or() across
  // multiple city names would work but pushes complexity for little
  // gain given the small result set per city.
  const { data } = await supabase
    .from('listings')
    .select('id, title, airport_name, airport_code, city, state, listing_type, asking_price, monthly_lease, square_feet, door_width, door_height, listing_photos(storage_path, display_order)')
    .eq('status', 'approved')
    .ilike('state', entry.state)
    .order('created_at', { ascending: false })

  const all = (data ?? []) as Listing[]
  const lowerNames = names.map(n => n.toLowerCase())
  return all.filter(l => l.city && lowerNames.includes(l.city.trim().toLowerCase()))
}

export default async function CityHangarsPage({ params }: Props) {
  const { slug } = await params
  const entry = getCityBySlug(slug)
  if (!entry) notFound()

  const listings = await loadCityListings(entry)
  const forSale  = listings.filter(l => l.listing_type === 'sale').length
  const forLease = listings.length - forSale

  // JSON-LD: breadcrumb + Place. Google uses both to build rich results.
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type':    'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',                          item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: `${entry.stateName} Hangars`,   item: `${SITE_URL}/hangars/${entry.stateSlug}` },
      { '@type': 'ListItem', position: 3, name: `${entry.city}, ${entry.state}`, item: `${SITE_URL}/hangars/city/${slug}` },
    ],
  }
  const place = {
    '@context': 'https://schema.org',
    '@type':    'Place',
    name:       `${entry.city}, ${entry.state}`,
    address:    { '@type': 'PostalAddress', addressLocality: entry.city, addressRegion: entry.state, addressCountry: 'US' },
  }

  return (
    <div style={{ maxWidth: '960px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(place) }} />

      {/* Breadcrumb */}
      <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#6b7280' }}>
        <Link href="/" style={{ color: '#6366f1', textDecoration: 'none' }}>Browse</Link>
        {' → '}
        <Link href={`/hangars/${entry.stateSlug}`} style={{ color: '#6366f1', textDecoration: 'none' }}>{entry.stateName}</Link>
        {' → '}
        <span>{entry.city}</span>
      </p>

      {/* Hero */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.75rem', color: '#111827' }}>
          Airplane Hangars in {entry.city}, {entry.state}
        </h1>
        <p style={{ margin: '0 0 1rem', color: '#6b7280', fontSize: '1rem', lineHeight: 1.6 }}>
          {listings.length > 0
            ? `${listings.length} hangar${listings.length !== 1 ? 's' : ''} available in ${entry.city}.${forSale ? ` ${forSale} for sale.` : ''}${forLease ? ` ${forLease} for lease or rent.` : ''}`
            : `No hangars currently listed in ${entry.city}. ${entry.metroDesc} Be the first to list, or post a hangar request to let owners know you're looking.`
          }
        </p>

        {listings.length > 0 && (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Total listings', value: listings.length },
              { label: 'For sale',       value: forSale },
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

      {/* Market context — hand-written per city for SEO uniqueness. */}
      <section style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', color: '#111827' }}>
          The {entry.city} hangar market
        </h2>
        <p style={{ margin: 0, color: '#374151', fontSize: '0.925rem', lineHeight: 1.7 }}>
          {entry.marketContext}
        </p>
      </section>

      {/* Listings */}
      {listings.length === 0 ? (
        <div style={{
          backgroundColor: 'white', border: '1px dashed #d1d5db',
          borderRadius: '12px', padding: '3rem 2rem', textAlign: 'center', marginBottom: '2rem',
        }}>
          <p style={{ fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>No listings in {entry.city} yet</p>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
            Be the first to list a hangar here, or post a request so owners in the area know you&apos;re looking.
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
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', marginBottom: '2rem' }}>
          {listings.map(listing => {
            const photos = [...(listing.listing_photos ?? [])].sort((a, b) => a.display_order - b.display_order)
            const thumb = photos[0] ? photoUrl(photos[0].storage_path) : null
            return (
              <Link key={listing.id} href={`/listing/${listing.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="hover-card" style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                  {thumb && (
                    <div style={{ height: '160px', overflow: 'hidden', backgroundColor: '#f3f4f6' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumb} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ padding: '0.875rem' }}>
                    <span style={{
                      display: 'inline-block', padding: '0.1rem 0.5rem', borderRadius: '999px',
                      fontSize: '0.7rem', fontWeight: '700',
                      backgroundColor: typeBg(listing.listing_type), color: typeColor(listing.listing_type),
                      marginBottom: '0.35rem',
                    }}>
                      {typeLabel(listing.listing_type)}
                    </span>
                    <h3 style={{ margin: '0 0 0.25rem', fontSize: '0.9rem', color: '#111827', fontWeight: '700' }}>{listing.title}</h3>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#6b7280' }}>
                      {listing.airport_code}
                      {listing.square_feet ? ` · ${listing.square_feet.toLocaleString()} sq ft` : ''}
                    </p>
                    <p style={{ margin: 0, fontWeight: '700', fontSize: '0.95rem', color: '#2563eb' }}>{priceLabel(listing)}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Airport cross-links */}
      {entry.airports.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', color: '#111827' }}>
            Airports near {entry.city}
          </h2>
          <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {entry.airports.map(a => (
              <Link key={a.icao}
                    href={`/hangars/airport/${a.icao.toLowerCase()}`}
                    style={{ display: 'block', padding: '0.85rem 1rem', backgroundColor: 'white',
                             border: '1px solid #e5e7eb', borderRadius: '10px',
                             textDecoration: 'none', color: 'inherit' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.15rem' }}>{a.icao}</div>
                <div style={{ fontWeight: '700', color: '#111827', fontSize: '0.9rem' }}>{a.name}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Cross-link back to state + related actions */}
      <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: '#111827' }}>
          Explore more hangars in {entry.stateName}
        </h2>
        <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.6 }}>
          See every hangar for sale, lease, or rent across {entry.stateName}, or post a free request so owners can reach out to you when space opens up.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href={`/hangars/${entry.stateSlug}`} style={{ padding: '0.5rem 1rem', backgroundColor: '#111827', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '0.825rem' }}>
            All {entry.stateName} hangars →
          </Link>
          <Link href="/requests/new" style={{ padding: '0.5rem 1rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '0.825rem' }}>
            Post a hangar request →
          </Link>
        </div>
      </div>
    </div>
  )
}
