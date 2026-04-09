import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { createServerClient } from '@/lib/supabase-server'
import PhotoGallery from '@/app/components/PhotoGallery'
import ContactForm from '@/app/components/ContactForm'
import FavoriteButton from '@/app/components/FavoriteButton'
import AircraftFitCalculator from '@/app/components/AircraftFitCalculator'
import LandingFees from '@/app/components/LandingFees'
import FuelPrices from '@/app/components/FuelPrices'
import ShareButton from '@/app/components/ShareButton'
import SimilarListings from '@/app/components/SimilarListings'
import type { Metadata } from 'next'
import { Star } from 'lucide-react'
import SponsorButton from '@/app/components/SponsorButton'
import ViewTracker from '@/app/components/ViewTracker'

type ListingPageProps = {
  params: Promise<{ id: string }>
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'
const SUPABASE_STORAGE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-photos`

// ── Dynamic SEO metadata ───────────────────────────────────────────────────
export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const { id } = await params
  const { data: listing } = await supabase
    .from('listings')
    .select('title, airport_name, airport_code, city, state, listing_type, asking_price, monthly_lease, description, square_feet, listing_photos(storage_path, display_order)')
    .eq('id', id)
    .single()

  if (!listing) {
    return { title: 'Listing Not Found | Hangar Marketplace' }
  }

  const price = listing.asking_price
    ? `$${listing.asking_price.toLocaleString()}`
    : listing.monthly_lease
      ? `$${listing.monthly_lease.toLocaleString()}/mo`
      : 'Contact for price'

  const listingLabel =
    listing.listing_type === 'sale'  ? 'For Sale' :
    listing.listing_type === 'space' ? 'Space Available' : 'For Lease'

  const title = `${listing.title} — Hangar ${listingLabel} at ${listing.airport_code} | Hangar Marketplace`
  const description = listing.description
    ? listing.description.slice(0, 160)
    : `${listing.title} at ${listing.airport_name} (${listing.airport_code}) in ${listing.city}, ${listing.state}. ${listingLabel}${listing.square_feet ? ` · ${listing.square_feet.toLocaleString()} sq ft` : ''} · ${price}. View details and contact the owner on Hangar Marketplace.`

  // First photo for OG image
  const photos = (listing.listing_photos as Array<{storage_path: string; display_order: number}> ?? [])
    .sort((a, b) => a.display_order - b.display_order)
  const ogImage = photos[0]
    ? `${SUPABASE_STORAGE}/${photos[0].storage_path}`
    : `${SITE_URL}/og-default.png`

  const canonicalUrl = `${SITE_URL}/listing/${id}`

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Hangar Marketplace',
      url: canonicalUrl,
      images: [{ url: ogImage, width: 1200, height: 630, alt: listing.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

type Photo = {
  id: string
  storage_path: string
  display_order: number
}

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
  is_featured: boolean
  featured_until: string | null
  is_sponsored: boolean
  sponsored_until: string | null
  stripe_customer_id: string | null
  contact_name: string
  contact_email: string
  contact_phone: string | null
  status: string
  view_count: number
  listing_photos: Photo[]
}

function photoUrl(path: string) {
  return `${SUPABASE_STORAGE}/${path}`
}

export default async function ListingDetailPage({ params }: ListingPageProps) {
  const { id } = await params

  // Get current user and saved state server-side (cookie auth — reliable)
  const serverSupabase = await createServerClient()
  const { data: { user } } = await serverSupabase.auth.getUser()

  let initialSaved = false
  if (user) {
    const { data: saved } = await serverSupabase
      .from('saved_listings')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', id)
      .maybeSingle()
    initialSaved = !!saved
  }

  const { data: listing, error } = await supabase
    .from('listings')
    .select('*, listing_photos(id, storage_path, display_order)')
    .eq('id', id)
    .eq('status', 'approved')
    .single()

  if (error || !listing) {
    return (
      <div>
        <Link href="/" style={{ color: '#6366f1', textDecoration: 'none' }}>← Back to listings</Link>
        <h1 style={{ marginTop: '1rem' }}>Listing Not Found</h1>
        <p>This listing does not exist or is not publicly available.</p>
      </div>
    )
  }

  const typedListing = listing as Listing

  const sortedPhotos = [...(typedListing.listing_photos ?? [])].sort(
    (a, b) => a.display_order - b.display_order
  )
  const photoUrls = sortedPhotos.map((p) => photoUrl(p.storage_path))

  // ── JSON-LD structured data ────────────────────────────────────────────────
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: typedListing.title,
    description: typedListing.description ?? `${typedListing.title} at ${typedListing.airport_name}`,
    image: photoUrls,
    url: `${SITE_URL}/listing/${typedListing.id}`,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: typedListing.asking_price ?? typedListing.monthly_lease ?? 0,
      priceSpecification: typedListing.monthly_lease
        ? { '@type': 'UnitPriceSpecification', price: typedListing.monthly_lease, priceCurrency: 'USD', unitText: 'MONTH' }
        : undefined,
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'LocalBusiness',
        name: typedListing.contact_name,
        address: {
          '@type': 'PostalAddress',
          addressLocality: typedListing.city,
          addressRegion: typedListing.state,
          addressCountry: 'US',
        },
      },
    },
    additionalProperty: [
      typedListing.square_feet && { '@type': 'PropertyValue', name: 'Square Footage', value: typedListing.square_feet, unitCode: 'FTK' },
      typedListing.door_width && { '@type': 'PropertyValue', name: 'Door Width', value: typedListing.door_width, unitCode: 'FOT' },
      typedListing.door_height && { '@type': 'PropertyValue', name: 'Door Height', value: typedListing.door_height, unitCode: 'FOT' },
    ].filter(Boolean),
    areaServed: {
      '@type': 'Airport',
      name: typedListing.airport_name,
      iataCode: typedListing.airport_code,
      address: {
        '@type': 'PostalAddress',
        addressLocality: typedListing.city,
        addressRegion: typedListing.state,
        addressCountry: 'US',
      },
    },
  }

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Fire view count increment client-side (bots don't run JS) */}
      <ViewTracker listingId={typedListing.id} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link href="/" style={{ color: '#6366f1', textDecoration: 'none', fontSize: '0.9rem' }}>
        ← Back to listings
      </Link>

      {/* Title + price badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', margin: '1rem 0' }}>
        <div>
          <h1 style={{ margin: '0 0 0.3rem', color: '#111827' }}>{typedListing.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, color: '#6b7280' }}>
              {typedListing.airport_name} ({typedListing.airport_code}) · {typedListing.city}, {typedListing.state}
            </p>
            {typedListing.view_count > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                fontSize: '0.75rem', color: '#9ca3af',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                {typedListing.view_count.toLocaleString()} view{typedListing.view_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <p style={{ margin: 0, fontWeight: '800', fontSize: '1.4rem', color: '#111827' }}>
            {typedListing.asking_price
              ? `$${typedListing.asking_price.toLocaleString()}`
              : typedListing.monthly_lease
                ? `$${typedListing.monthly_lease.toLocaleString()}/mo`
                : 'Contact for price'}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Sponsored badge */}
            {typedListing.is_sponsored &&
              typedListing.sponsored_until &&
              new Date(typedListing.sponsored_until) > new Date() && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                padding: '0.2rem 0.6rem', borderRadius: '999px',
                backgroundColor: '#6366f1', color: 'white',
                fontSize: '0.75rem', fontWeight: '700',
              }}>
                Sponsored
              </span>
            )}
            {/* Featured badge (admin) */}
            {typedListing.is_featured &&
              typedListing.featured_until &&
              new Date(typedListing.featured_until) > new Date() && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                padding: '0.2rem 0.6rem', borderRadius: '999px',
                backgroundColor: '#f59e0b', color: 'white',
                fontSize: '0.75rem', fontWeight: '700',
              }}>
                <Star size={12} style={{ flexShrink: 0 }} /> Featured
              </span>
            )}
            <span style={badgeStyle(typedListing.listing_type)}>
              {typedListing.listing_type === 'sale' ? 'For Sale' : typedListing.listing_type === 'space' ? 'Space Available' : 'For Lease'}
            </span>
            <FavoriteButton
              listingId={typedListing.id}
              userId={user?.id ?? null}
              initialSaved={initialSaved}
            />
            <ShareButton title={typedListing.title} />
          </div>
        </div>
      </div>

      {/* Photo gallery */}
      {photoUrls.length > 0 ? (
        <PhotoGallery urls={photoUrls} title={typedListing.title} />
      ) : (
        <div style={{
          width: '100%', height: '260px', borderRadius: '12px',
          backgroundColor: '#f3f4f6', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: '#9ca3af', fontSize: '0.9rem', marginBottom: '1.5rem',
        }}>
          No photos provided for this listing
        </div>
      )}

      {/* Sponsor CTA — shown to listing owners to boost visibility */}
      <div id="sponsor" style={{ marginBottom: '1.5rem' }}>
        <SponsorButton
          listingId={typedListing.id}
          sponsoredUntil={typedListing.sponsored_until}
          hasStripeCustomer={!!typedListing.stripe_customer_id}
        />
      </div>

      {/* Details card — 2 columns on desktop, 1 on mobile (see globals.css .detail-grid) */}
      <div className="detail-grid">
        <DetailCard title="Hangar Details">
          <DetailRow label="Listing type" value={typedListing.listing_type === 'sale' ? 'For Sale' : typedListing.listing_type === 'space' ? 'Space Available' : 'For Lease'} />
          <DetailRow label="Ownership" value={typedListing.ownership_type} />
          {typedListing.square_feet && (
            <DetailRow label="Square feet" value={`${typedListing.square_feet.toLocaleString()} sq ft`} />
          )}
          {(typedListing.door_width || typedListing.door_height) && (
            <DetailRow
              label="Door dimensions"
              value={`${typedListing.door_width ?? '?'}′ W × ${typedListing.door_height ?? '?'}′ H`}
            />
          )}
          {typedListing.hangar_depth && (
            <DetailRow label="Hangar depth" value={`${typedListing.hangar_depth}′`} />
          )}
        </DetailCard>

        <DetailCard title="Contact Seller">
          <DetailRow label="Name" value={typedListing.contact_name} />
          <div style={{ marginTop: '0.35rem' }}>
            <span style={detailLabelStyle}>Email</span>
            <br />
            <a href={`mailto:${typedListing.contact_email}`} style={{ color: '#6366f1', textDecoration: 'none', fontSize: '0.9rem' }}>
              {typedListing.contact_email}
            </a>
          </div>
          {typedListing.contact_phone && (
            <div style={{ marginTop: '0.35rem' }}>
              <span style={detailLabelStyle}>Phone</span>
              <br />
              <a href={`tel:${typedListing.contact_phone}`} style={{ color: '#6366f1', textDecoration: 'none', fontSize: '0.9rem' }}>
                {typedListing.contact_phone}
              </a>
            </div>
          )}
        </DetailCard>
      </div>

      {/* Description */}
      {typedListing.description && (
        <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: '#374151' }}>About this hangar</h2>
          <p style={{ margin: 0, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {typedListing.description}
          </p>
        </div>
      )}

      {/* Airplane fit calculator */}
      <AircraftFitCalculator
        doorWidth={typedListing.door_width}
        doorHeight={typedListing.door_height}
        hangarDepth={typedListing.hangar_depth}
      />

      {/* Landing fees */}
      <LandingFees
        airportCode={typedListing.airport_code}
        airportName={typedListing.airport_name}
      />

      {/* Fuel prices */}
      <FuelPrices airportCode={typedListing.airport_code} />

      {/* Contact form */}
      <ContactForm
        listingId={typedListing.id}
        listingTitle={typedListing.title}
        sellerName={typedListing.contact_name}
        sellerEmail={typedListing.contact_email}
      />

      {/* Similar listings */}
      <SimilarListings
        currentId={typedListing.id}
        airportCode={typedListing.airport_code}
        state={typedListing.state}
        supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
      />
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem' }}>
      <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: '#374151' }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>{children}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span style={detailLabelStyle}>{label}</span>
      <br />
      <span style={{ fontSize: '0.9rem', color: '#111827' }}>{value}</span>
    </div>
  )
}

const detailLabelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: '600',
  color: '#9ca3af',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

function badgeStyle(type: string): React.CSSProperties {
  const colors =
    type === 'sale'  ? { bg: '#dbeafe', text: '#1e40af' } :
    type === 'space' ? { bg: '#fef3c7', text: '#92400e' } :
                       { bg: '#dcfce7', text: '#166534' }
  return {
    display: 'inline-block',
    padding: '0.2rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: '600',
    backgroundColor: colors.bg,
    color: colors.text,
  }
}
