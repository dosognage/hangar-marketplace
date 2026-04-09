/**
 * Saved Listings page
 *
 * Shows all listings the logged-in user has hearted.
 */

import Link from 'next/link'
import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function photoUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/listing-photos/${path}`
}

export default async function SavedListingsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/saved')

  const { data: saved } = await supabase
    .from('saved_listings')
    .select(`
      listing_id,
      listings (
        id, title, airport_code, city, state,
        listing_type, asking_price, monthly_lease,
        square_feet, status,
        listing_photos (storage_path, display_order)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Flatten and filter out any deleted listings
  const listings = (saved ?? [])
    .map((row: any) => row.listings)
    .filter((l: any) => l && l.status === 'approved')

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>Saved Listings</h1>
        <p style={{ color: '#6b7280', margin: 0 }}>
          {listings.length} saved listing{listings.length !== 1 ? 's' : ''}
        </p>
      </div>

      {listings.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          border: '1px dashed #d1d5db',
          borderRadius: '12px',
          padding: '3rem',
          textAlign: 'center',
          color: '#6b7280',
        }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No saved listings yet</p>
          <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Browse listings and tap the ❤️ Save button to save them here.
          </p>
          <Link
            href="/"
            style={{
              padding: '0.6rem 1.25rem',
              backgroundColor: '#111827',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '0.875rem',
            }}
          >
            Browse listings
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {listings.map((listing: any) => {
            const sortedPhotos = [...(listing.listing_photos ?? [])].sort(
              (a: any, b: any) => a.display_order - b.display_order
            )
            const coverPath = sortedPhotos[0]?.storage_path ?? null
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
                <div style={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  transition: 'box-shadow 0.15s',
                }}>
                  {coverPath ? (
                    <img
                      src={photoUrl(coverPath)}
                      alt={listing.title}
                      style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%', height: '140px', backgroundColor: '#f3f4f6',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#9ca3af', fontSize: '0.875rem',
                    }}>
                      No photos
                    </div>
                  )}
                  <div style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '1rem', color: '#111827' }}>{price}</span>
                      <span style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        backgroundColor: listing.listing_type === 'sale' ? '#dbeafe' : '#dcfce7',
                        color: listing.listing_type === 'sale' ? '#1e40af' : '#166534',
                      }}>
                        {listing.listing_type === 'sale' ? 'For Sale' : 'For Lease'}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 0.2rem', fontWeight: '600', fontSize: '0.9rem', color: '#111827' }}>
                      {listing.title}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
                      {listing.airport_code} · {listing.city}, {listing.state}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
