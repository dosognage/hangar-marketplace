/**
 * /listing/[id]/print — Clean printable version of a listing.
 * Brokers can open this, Cmd+P, and hand it to a client.
 * No nav, no sidebar — just the listing details on white.
 */
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SITE_URL     = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'

type Props = { params: Promise<{ id: string }> }

function photoUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/listing-photos/${path}`
}

function row(label: string, value: string | number | null | undefined) {
  if (value == null || value === '') return null
  return (
    <tr>
      <td style={{ padding: '6px 12px', fontWeight: '600', color: '#374151', fontSize: '13px', width: '160px', verticalAlign: 'top', borderBottom: '1px solid #f3f4f6' }}>{label}</td>
      <td style={{ padding: '6px 12px', color: '#111827', fontSize: '13px', borderBottom: '1px solid #f3f4f6' }}>{value}</td>
    </tr>
  )
}

export default async function PrintListingPage({ params }: Props) {
  const { id } = await params

  const { data: listing } = await supabase
    .from('listings')
    .select('*, listing_photos(storage_path, display_order)')
    .eq('id', id)
    .eq('status', 'approved')
    .single()

  if (!listing) notFound()

  const photos = [...(listing.listing_photos ?? [])].sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order)
  const cover  = photos[0]?.storage_path

  const price = listing.asking_price
    ? `$${Number(listing.asking_price).toLocaleString()}`
    : listing.monthly_lease
      ? `$${Number(listing.monthly_lease).toLocaleString()}/month`
      : 'Contact for price'

  const listingUrl = `${SITE_URL}/listing/${id}`

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <title>{listing.title} — Hangar Marketplace</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; background: white; color: #111827; }
          @media print {
            .no-print { display: none !important; }
            body { font-size: 12px; }
          }
          @page { margin: 0.75in; }
        `}</style>
      </head>
      <body style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>

        {/* Print button */}
        <div className="no-print" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => window.print()}
            style={{
              padding: '0.5rem 1.25rem', backgroundColor: '#1a3a5c', color: 'white',
              border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '14px',
            }}
          >
            🖨 Print / Save as PDF
          </button>
          <a href={`/listing/${id}`} style={{ padding: '0.5rem 1.25rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', color: '#374151', textDecoration: 'none' }}>
            ← Back to listing
          </a>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #1a3a5c' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
              ✈ Hangar Marketplace · Aviation Properties
            </p>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#111827', lineHeight: 1.2, marginBottom: '4px' }}>
              {listing.title}
            </h1>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>
              {listing.airport_name} ({listing.airport_code}) · {listing.city}, {listing.state}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: '22px', fontWeight: '800', color: '#1a3a5c' }}>{price}</p>
            <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
              {listing.listing_type === 'sale' ? 'For Sale' : listing.listing_type === 'space' ? 'Space Available' : 'For Lease'}
            </p>
          </div>
        </div>

        {/* Cover photo */}
        {cover && (
          <div style={{ marginBottom: '1.5rem', borderRadius: '8px', overflow: 'hidden', maxHeight: '320px' }}>
            <img
              src={photoUrl(cover)}
              alt={listing.title}
              style={{ width: '100%', maxHeight: '320px', objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}

        {/* Additional photos (up to 3 more) */}
        {photos.length > 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {photos.slice(1, 4).map((p: { storage_path: string }, i: number) => (
              <img key={i} src={photoUrl(p.storage_path)} alt=""
                style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '6px', display: 'block' }} />
            ))}
          </div>
        )}

        {/* Property details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              Hangar Details
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
              <tbody>
                {row('Square Footage', listing.square_feet ? `${Number(listing.square_feet).toLocaleString()} sq ft` : null)}
                {row('Door Width', listing.door_width ? `${listing.door_width} ft` : null)}
                {row('Door Height', listing.door_height ? `${listing.door_height} ft` : null)}
                {row('Hangar Depth', listing.hangar_depth ? `${listing.hangar_depth} ft` : null)}
                {row('Runway Length', listing.runway_length_ft ? `${Number(listing.runway_length_ft).toLocaleString()} ft` : null)}
                {row('Runway Surface', listing.runway_surface)}
                {row('Ownership', listing.ownership_type)}
              </tbody>
            </table>
          </div>

          <div>
            <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              Contact
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
              <tbody>
                {row('Name', listing.contact_name)}
                {row('Email', listing.contact_email)}
                {row('Phone', listing.contact_phone)}
              </tbody>
            </table>

            <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '1rem 0 8px' }}>
              Location
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
              <tbody>
                {row('Airport', `${listing.airport_name} (${listing.airport_code})`)}
                {row('City / State', `${listing.city}, ${listing.state}`)}
                {row('Address', listing.address)}
              </tbody>
            </table>
          </div>
        </div>

        {/* Description */}
        {listing.description && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              Description
            </h2>
            <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {listing.description}
            </p>
          </div>
        )}

        {/* Footer */}
        <div style={{ paddingTop: '1rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '11px', color: '#9ca3af' }}>
            Listed on Hangar Marketplace · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <p style={{ fontSize: '11px', color: '#2563eb' }}>{listingUrl}</p>
        </div>

      </body>
    </html>
  )
}
