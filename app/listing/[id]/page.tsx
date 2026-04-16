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

export const dynamic = 'force-dynamic'


import AirportMapClient from '@/app/components/AirportMapClient'

type ListingPageProps = {
  params:       Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
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

  const title = `${listing.title}: Hangar ${listingLabel} at ${listing.airport_code} | Hangar Marketplace`
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
  property_type: string
  listing_type: string
  ownership_type: string
  asking_price: number | null
  monthly_lease: number | null
  // Hangar-specific
  square_feet: number | null
  door_width: number | null
  door_height: number | null
  hangar_depth: number | null
  // Home/land-specific
  bedrooms: number | null
  bathrooms: number | null
  home_sqft: number | null
  lot_acres: number | null
  has_runway_access: boolean | null
  airpark_name: string | null
  // Address
  address: string | null
  zip_code: string | null
  // Runway
  runway_length_ft: number | null
  runway_width_ft: number | null
  runway_surface: string | null
  description: string | null
  is_featured: boolean
  featured_until: string | null
  is_sponsored: boolean
  sponsored_until: string | null
  stripe_customer_id: string | null
  user_id: string | null
  broker_profile_id: string | null
  contact_name: string
  contact_email: string
  contact_phone: string | null
  status: string
  view_count: number
  is_sample: boolean
  hangar_lat: number | null
  hangar_lng: number | null
  listing_photos: Photo[]
}

function photoUrl(path: string) {
  return `${SUPABASE_STORAGE}/${path}`
}

export default async function ListingDetailPage({ params, searchParams }: ListingPageProps) {
  const { id }   = await params
  const { from } = await searchParams
  const fromBrokerDashboard = from === 'broker-dashboard'
  const backHref  = fromBrokerDashboard ? '/broker/dashboard' : '/'
  const backLabel = fromBrokerDashboard ? '← Back to dashboard' : '← Back to listings'

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
        <Link href={backHref} style={{ color: '#6366f1', textDecoration: 'none' }}>{backLabel}</Link>
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
      <Link href={backHref} style={{ color: '#6366f1', textDecoration: 'none', fontSize: '0.9rem' }}>
        {backLabel}
      </Link>

      {/* Sample listing banner */}
      {typedListing.is_sample && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          backgroundColor: '#fffbeb',
          border: '1.5px solid #f59e0b',
          borderRadius: '10px',
          padding: '1rem 1.25rem',
          marginTop: '1rem',
        }}>
          <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>🔍</span>
          <div>
            <p style={{ margin: '0 0 0.2rem', fontWeight: '700', color: '#92400e', fontSize: '0.95rem' }}>
              This is a sample listing
            </p>
            <p style={{ margin: 0, color: '#78350f', fontSize: '0.85rem', lineHeight: 1.5 }}>
              It exists to show you what a real hangar listing looks like: photos, specs, pricing, and more.
              Real listings from verified owners will appear just like this.{' '}
              <Link href="/submit" style={{ color: '#92400e', fontWeight: '600' }}>
                List your hangar free →
              </Link>
            </p>
          </div>
        </div>
      )}

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
            <ShareButton title={typedListing.title} listingId={typedListing.id} />
            <a
              href={`/listing/${typedListing.id}/print`}
              target="_blank"
              rel="noopener noreferrer"
              title="Print or save as PDF"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.35rem 0.85rem',
                border: '1px solid #d1d5db', borderRadius: '6px',
                backgroundColor: 'white', color: '#374151',
                fontSize: '0.825rem', fontWeight: '500', textDecoration: 'none',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print
            </a>
          </div>
        </div>
      </div>

      {/* Photo gallery */}
      {photoUrls.length > 0 ? (
        <PhotoGallery urls={photoUrls} title={typedListing.title} listingId={typedListing.id} />
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

      {/* Sponsor CTA — only shown to the listing owner */}
      {user && (
        user.id === typedListing.user_id ||
        (user.user_metadata?.broker_profile_id && user.user_metadata.broker_profile_id === typedListing.broker_profile_id)
      ) && (
        <div id="sponsor" style={{ marginBottom: '1.5rem' }}>
          <SponsorButton
            listingId={typedListing.id}
            sponsoredUntil={typedListing.sponsored_until}
            hasStripeCustomer={!!typedListing.stripe_customer_id}
          />
        </div>
      )}

      {/* Details card — 2 columns on desktop, 1 on mobile (see globals.css .detail-grid) */}
      <div className="detail-grid">
        <DetailCard title={
          typedListing.property_type === 'airport_home'     ? 'Home Details' :
          typedListing.property_type === 'land'             ? 'Land Details' :
          typedListing.property_type === 'fly_in_community' ? 'Community Details' :
          'Hangar Details'
        }>
          <DetailRow
            label="Listing type"
            value={typedListing.listing_type === 'sale' ? 'For Sale' : typedListing.listing_type === 'space' ? 'Space Available' : 'For Lease'}
          />
          {/* Address — non-hangar listings */}
          {typedListing.address && (
            <DetailRow
              label="Address"
              value={[
                typedListing.address,
                typedListing.city,
                [typedListing.state, typedListing.zip_code].filter(Boolean).join(' '),
              ].filter(Boolean).join(', ')}
            />
          )}
          {typedListing.airpark_name && (
            <DetailRow label="Airpark / Community" value={typedListing.airpark_name} />
          )}
          {/* Hangar-specific */}
          {typedListing.property_type === 'hangar' && typedListing.ownership_type && (
            <DetailRow label="Ownership" value={typedListing.ownership_type} />
          )}
          {typedListing.property_type === 'hangar' && typedListing.square_feet && (
            <DetailRow label="Square feet" value={`${typedListing.square_feet.toLocaleString()} sq ft`} />
          )}
          {typedListing.property_type === 'hangar' && (typedListing.door_width || typedListing.door_height) && (
            <DetailRow label="Door dimensions" value={`${typedListing.door_width ?? '?'}′ W × ${typedListing.door_height ?? '?'}′ H`} />
          )}
          {typedListing.property_type === 'hangar' && typedListing.hangar_depth && (
            <DetailRow label="Hangar depth" value={`${typedListing.hangar_depth}′`} />
          )}
          {/* Home-specific */}
          {typedListing.bedrooms != null && (
            <DetailRow label="Bedrooms" value={`${typedListing.bedrooms}`} />
          )}
          {typedListing.bathrooms != null && (
            <DetailRow label="Bathrooms" value={`${typedListing.bathrooms}`} />
          )}
          {typedListing.home_sqft != null && (
            <DetailRow label="Home size" value={`${typedListing.home_sqft.toLocaleString()} sq ft`} />
          )}
          {/* Home + land */}
          {typedListing.lot_acres != null && (
            <DetailRow label="Lot size" value={`${typedListing.lot_acres} acres`} />
          )}
          {typedListing.has_runway_access && (
            <DetailRow label="Runway access" value="✈ Direct runway / taxiway access" />
          )}
          {/* Runway dimensions */}
          {(typedListing.runway_length_ft || typedListing.runway_width_ft) && (
            <DetailRow
              label="Runway dimensions"
              value={[
                typedListing.runway_length_ft ? `${typedListing.runway_length_ft.toLocaleString()}′ long` : null,
                typedListing.runway_width_ft  ? `${typedListing.runway_width_ft}′ wide` : null,
              ].filter(Boolean).join(' × ')}
            />
          )}
          {typedListing.runway_surface && (
            <DetailRow label="Runway surface" value={typedListing.runway_surface} />
          )}
        </DetailCard>

        <DetailCard title="Contact Seller">
          {user ? (
            <>
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
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔒</div>
              <p style={{ margin: '0 0 0.25rem', fontWeight: '600', color: '#111827', fontSize: '0.9rem' }}>
                Sign in to view contact info
              </p>
              <p style={{ margin: '0 0 1rem', color: '#6b7280', fontSize: '0.8rem', lineHeight: 1.4 }}>
                Create a free account to see the seller's name, email, and phone number.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href={`/login?next=/listing/${typedListing.id}`} style={{
                  padding: '0.45rem 1rem', borderRadius: '6px',
                  backgroundColor: '#111827', color: 'white',
                  fontSize: '0.85rem', fontWeight: '600', textDecoration: 'none',
                }}>
                  Sign in
                </Link>
                <Link href={`/signup?next=/listing/${typedListing.id}`} style={{
                  padding: '0.45rem 1rem', borderRadius: '6px',
                  backgroundColor: 'white', color: '#111827',
                  border: '1px solid #d1d5db',
                  fontSize: '0.85rem', fontWeight: '600', textDecoration: 'none',
                }}>
                  Create account
                </Link>
              </div>
            </div>
          )}
        </DetailCard>
      </div>

      {/* Description */}
      {typedListing.description && (
        <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: '#374151' }}>
            {typedListing.property_type === 'airport_home'     ? 'About this home' :
             typedListing.property_type === 'land'             ? 'About this land' :
             typedListing.property_type === 'fly_in_community' ? 'About this community' :
             'About this hangar'}
          </h2>
          <p style={{ margin: 0, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {typedListing.description}
          </p>
        </div>
      )}

      {/* Airport diagram — only shown when the seller pinned a location */}
      {typedListing.hangar_lat && typedListing.hangar_lng && (
        <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: '0 0 0.2rem', fontSize: '1rem', color: '#374151' }}>Hangar location on airport</h2>
          <p style={{ margin: '0 0 0.85rem', fontSize: '0.8rem', color: '#9ca3af' }}>
            The seller has pinned their exact hangar position on the airport diagram.
          </p>
          <AirportMapClient
            icao={typedListing.airport_code}
            savedLat={typedListing.hangar_lat}
            savedLng={typedListing.hangar_lng}
            editable={false}
            height="360px"
            hideZoomMobile
          />
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

      {/* Contact form — hidden on sample listings, gated behind auth for others */}
      {typedListing.is_sample ? (
        <div style={{
          backgroundColor: '#1a3a5c',
          borderRadius: '10px',
          padding: '1.75rem',
          textAlign: 'center',
          color: 'white',
        }}>
          <p style={{ margin: '0 0 0.4rem', fontSize: '1.1rem', fontWeight: '700' }}>
            Own a hangar at this airport?
          </p>
          <p style={{ margin: '0 0 1.25rem', fontSize: '0.9rem', color: '#93c5fd', lineHeight: 1.5 }}>
            List it for free in minutes. Real buyers are searching for hangars right now.
          </p>
          <Link href="/submit" style={{
            display: 'inline-block',
            backgroundColor: 'white',
            color: '#1a3a5c',
            padding: '0.7rem 1.75rem',
            borderRadius: '8px',
            fontWeight: '700',
            fontSize: '0.95rem',
            textDecoration: 'none',
          }}>
            List your hangar free →
          </Link>
        </div>
      ) : user ? (
        <ContactForm
          listingId={typedListing.id}
          listingTitle={typedListing.title}
          sellerName={typedListing.contact_name}
          sellerEmail={typedListing.contact_email}
          prefillName={user.user_metadata?.full_name ?? ''}
          prefillEmail={user.email ?? ''}
          prefillPhone={user.user_metadata?.phone ?? ''}
          profileComplete={
            !!(user.user_metadata?.full_name?.trim()) &&
            !!(user.user_metadata?.phone?.trim())
          }
        />
      ) : (
        <div style={{
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.6rem' }}>🔒</div>
          <p style={{ margin: '0 0 0.3rem', fontWeight: '700', color: '#111827', fontSize: '1rem' }}>
            Sign in to contact the seller
          </p>
          <p style={{ margin: '0 0 1.25rem', color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.5 }}>
            Create a free Hangar Marketplace account to send a message directly to this listing's owner.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href={`/login?next=/listing/${typedListing.id}`} style={{
              padding: '0.65rem 1.5rem', borderRadius: '7px',
              backgroundColor: '#111827', color: 'white',
              fontSize: '0.925rem', fontWeight: '600', textDecoration: 'none',
            }}>
              Sign in
            </Link>
            <Link href={`/signup?next=/listing/${typedListing.id}`} style={{
              padding: '0.65rem 1.5rem', borderRadius: '7px',
              backgroundColor: 'white', color: '#111827',
              border: '1px solid #d1d5db',
              fontSize: '0.925rem', fontWeight: '600', textDecoration: 'none',
            }}>
              Create a free account
            </Link>
          </div>
        </div>
      )}

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
