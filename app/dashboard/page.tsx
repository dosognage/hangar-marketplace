/**
 * Seller Dashboard
 *
 * Shows all listings submitted by the currently logged-in user.
 * Middleware already guarantees the user is authenticated before
 * this page renders.
 */

import Link from 'next/link'
import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import DeleteListingButton from '@/app/components/DeleteListingButton'

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
  status: string
  created_at: string
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Pending review', color: '#92400e', bg: '#fef3c7' },
  approved: { label: 'Live',           color: '#166534', bg: '#dcfce7' },
  rejected: { label: 'Rejected',       color: '#991b1b', bg: '#fee2e2' },
}

export default async function DashboardPage() {
  const supabase = await createServerClient()

  // Verify session server-side
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect('/login?next=/dashboard')
  }

  // Fetch this user's listings
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, title, airport_name, airport_code, city, state, listing_type, asking_price, monthly_lease, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const displayName = user.user_metadata?.full_name ?? user.email ?? 'Seller'

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>My Listings</h1>
        <p style={{ color: '#6b7280', margin: 0 }}>
          Logged in as <strong>{user.email}</strong>
          {displayName !== user.email && ` · ${displayName}`}
        </p>
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom: '2rem' }}>
        <Link
          href="/submit"
          style={{
            display: 'inline-block',
            padding: '0.6rem 1.25rem',
            backgroundColor: '#111827',
            color: 'white',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '0.875rem',
          }}
        >
          + Submit new listing
        </Link>
      </div>

      {error && (
        <p style={{ color: '#dc2626' }}>
          Could not load your listings. Make sure you&apos;ve run the SQL migration
          that adds the <code>user_id</code> column to the listings table.
        </p>
      )}

      {!error && (!listings || listings.length === 0) && (
        <div style={{
          backgroundColor: 'white',
          border: '1px dashed #d1d5db',
          borderRadius: '12px',
          padding: '3rem',
          textAlign: 'center',
          color: '#6b7280',
        }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No listings yet</p>
          <p style={{ fontSize: '0.875rem' }}>
            Submit your first hangar listing using the button above.
          </p>
        </div>
      )}

      {listings && listings.length > 0 && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {listings.map((listing: Listing) => {
            const s = STATUS_LABELS[listing.status] ?? STATUS_LABELS.pending
            return (
              <div
                key={listing.id}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: '1rem' }}>{listing.title}</h2>
                    <span style={{
                      padding: '0.15rem 0.6rem',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      backgroundColor: s.bg,
                      color: s.color,
                    }}>
                      {s.label}
                    </span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                    {listing.airport_name} ({listing.airport_code}) · {listing.city}, {listing.state}
                  </p>
                  <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                    {listing.listing_type === 'sale' ? 'For Sale' : 'For Lease'}
                    {listing.asking_price ? ` · $${listing.asking_price.toLocaleString()}` : ''}
                    {listing.monthly_lease ? ` · $${listing.monthly_lease.toLocaleString()}/mo` : ''}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {listing.status === 'approved' && (
                    <Link
                      href={`/listing/${listing.id}`}
                      style={{
                        fontSize: '0.8rem',
                        color: '#6366f1',
                        textDecoration: 'none',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                        padding: '0.35rem 0.85rem',
                        border: '1px solid #c7d2fe',
                        borderRadius: '6px',
                      }}
                    >
                      View live →
                    </Link>
                  )}
                  <Link
                    href={`/listing/${listing.id}/edit`}
                    style={{
                      fontSize: '0.8rem',
                      color: '#374151',
                      textDecoration: 'none',
                      fontWeight: '500',
                      whiteSpace: 'nowrap',
                      padding: '0.35rem 0.85rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                    }}
                  >
                    Edit
                  </Link>
                  <DeleteListingButton listingId={listing.id} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
