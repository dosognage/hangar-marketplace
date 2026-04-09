import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import PhotoGallery from '@/app/components/PhotoGallery'
import ContactForm from '@/app/components/ContactForm'

type ListingPageProps = {
  params: Promise<{ id: string }>
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
  description: string | null
  contact_name: string
  contact_email: string
  contact_phone: string | null
  status: string
  listing_photos: Photo[]
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function photoUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/listing-photos/${path}`
}

export default async function ListingDetailPage({ params }: ListingPageProps) {
  const { id } = await params

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

  return (
    <div style={{ maxWidth: '900px' }}>
      <Link href="/" style={{ color: '#6366f1', textDecoration: 'none', fontSize: '0.9rem' }}>
        ← Back to listings
      </Link>

      {/* Title + price badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', margin: '1rem 0' }}>
        <div>
          <h1 style={{ margin: '0 0 0.3rem' }}>{typedListing.title}</h1>
          <p style={{ margin: 0, color: '#6b7280' }}>
            {typedListing.airport_name} ({typedListing.airport_code}) · {typedListing.city}, {typedListing.state}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '0 0 0.25rem', fontWeight: '800', fontSize: '1.4rem', color: '#111827' }}>
            {typedListing.asking_price
              ? `$${typedListing.asking_price.toLocaleString()}`
              : typedListing.monthly_lease
                ? `$${typedListing.monthly_lease.toLocaleString()}/mo`
                : 'Contact for price'}
          </p>
          <span style={badgeStyle(typedListing.listing_type)}>
            {typedListing.listing_type === 'sale' ? 'For Sale' : 'For Lease'}
          </span>
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

      {/* Details card — 2 columns on desktop, 1 on mobile (see globals.css .detail-grid) */}
      <div className="detail-grid">
        <DetailCard title="Hangar Details">
          <DetailRow label="Listing type" value={typedListing.listing_type === 'sale' ? 'For Sale' : 'For Lease'} />
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

      {/* Contact form */}
      <ContactForm
        listingId={typedListing.id}
        listingTitle={typedListing.title}
        sellerName={typedListing.contact_name}
        sellerEmail={typedListing.contact_email}
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
  const isSale = type === 'sale'
  return {
    display: 'inline-block',
    padding: '0.2rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: '600',
    backgroundColor: isSale ? '#dbeafe' : '#dcfce7',
    color: isSale ? '#1e40af' : '#166534',
  }
}
