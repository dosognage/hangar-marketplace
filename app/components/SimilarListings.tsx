import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Photo = { storage_path: string; display_order: number }

type Listing = {
  id: string
  title: string
  airport_code: string
  city: string
  state: string
  listing_type: string
  asking_price: number | null
  monthly_lease: number | null
  square_feet: number | null
  door_width: number | null
  door_height: number | null
  listing_photos: Photo[]
}

type Props = {
  currentId: string
  airportCode: string
  state: string
  supabaseUrl: string
}

function badgeStyle(type: string): React.CSSProperties {
  const colors =
    type === 'sale'  ? { bg: '#dbeafe', text: '#1e40af' } :
    type === 'space' ? { bg: '#fef3c7', text: '#92400e' } :
                       { bg: '#dcfce7', text: '#166534' }
  return {
    display: 'inline-block', padding: '0.15rem 0.5rem',
    borderRadius: '999px', fontSize: '0.7rem', fontWeight: '600',
    backgroundColor: colors.bg, color: colors.text, whiteSpace: 'nowrap',
  }
}

export default async function SimilarListings({ currentId, airportCode, state, supabaseUrl }: Props) {
  function photoUrl(path: string) {
    return `${supabaseUrl}/storage/v1/object/public/listing-photos/${path}`
  }

  // First: same airport (excluding current listing)
  const { data: sameAirport } = await supabase
    .from('listings')
    .select('id, title, airport_code, city, state, listing_type, asking_price, monthly_lease, square_feet, door_width, door_height, listing_photos(storage_path, display_order)')
    .eq('status', 'approved')
    .eq('airport_code', airportCode)
    .neq('id', currentId)
    .limit(4)

  // Then: same state (fill up to 4 if airport didn't have enough)
  let similar: Listing[] = (sameAirport ?? []) as Listing[]

  if (similar.length < 4) {
    const exclude = [currentId, ...similar.map(l => l.id)]
    const { data: sameState } = await supabase
      .from('listings')
      .select('id, title, airport_code, city, state, listing_type, asking_price, monthly_lease, square_feet, door_width, door_height, listing_photos(storage_path, display_order)')
      .eq('status', 'approved')
      .eq('state', state)
      .not('id', 'in', `(${exclude.join(',')})`)
      .limit(4 - similar.length)
    similar = [...similar, ...((sameState ?? []) as Listing[])]
  }

  if (similar.length === 0) return null

  const label = sameAirport && sameAirport.length > 0
    ? `More hangars at ${airportCode}`
    : `More hangars in ${state}`

  return (
    <div style={{ marginTop: '2.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '2rem' }}>
      <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#111827' }}>{label}</h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '0.85rem',
      }}>
        {similar.map(listing => {
          const sortedPhotos = [...(listing.listing_photos ?? [])].sort(
            (a, b) => a.display_order - b.display_order
          )
          const cover = sortedPhotos[0]?.storage_path
          const price = listing.asking_price
            ? `$${listing.asking_price.toLocaleString()}`
            : listing.monthly_lease
              ? `$${listing.monthly_lease.toLocaleString()}/mo`
              : 'Contact for price'

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
                  borderRadius: '8px',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.15s, border-color 0.15s',
                }}
              >
                {/* Photo */}
                <div style={{ height: '110px', backgroundColor: '#f3f4f6', overflow: 'hidden' }}>
                  {cover ? (
                    <img
                      src={photoUrl(cover)}
                      alt={listing.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.75rem' }}>
                      No photo
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '0.65rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.25rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#111827' }}>{price}</span>
                    <span style={badgeStyle(listing.listing_type)}>
                      {listing.listing_type === 'sale' ? 'For Sale' : listing.listing_type === 'space' ? 'Space' : 'Lease'}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 0.2rem', fontSize: '0.8rem', fontWeight: '600', color: '#111827', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {listing.title}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#6b7280' }}>
                    {listing.airport_code} · {listing.city}, {listing.state}
                  </p>
                  {listing.square_feet && (
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', color: '#6b7280' }}>
                      {listing.square_feet.toLocaleString()} sq ft
                    </p>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
