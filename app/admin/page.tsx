/**
 * Admin Review Page
 *
 * The middleware already ensures only users in ADMIN_EMAILS can reach
 * this page. We double-check here server-side for defence in depth.
 */

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import ApproveRejectButtons from './ApproveRejectButtons'

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
}

export default async function AdminPage() {
  // Double-check auth (middleware is the primary guard)
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/admin')

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())

  if (!adminEmails.includes((user.email ?? '').toLowerCase())) {
    redirect('/')
  }

  // Fetch pending listings using the service-role key (bypasses RLS)
  const { data: listings, error } = await supabaseAdmin
    .from('listings')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div>
        <h1>Admin Review</h1>
        <p style={{ color: '#dc2626' }}>Failed to load pending listings.</p>
        <pre>{error.message}</pre>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>Admin Review</h1>
        <p style={{ color: '#6b7280', margin: 0 }}>
          {listings?.length ?? 0} pending listing{listings?.length !== 1 ? 's' : ''} awaiting review
        </p>
      </div>

      {!listings || listings.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          border: '1px dashed #d1d5db',
          borderRadius: '12px',
          padding: '3rem',
          textAlign: 'center',
          color: '#6b7280',
        }}>
          All caught up — no pending listings.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {listings.map((listing: Listing) => (
            <div
              key={listing.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1.25rem',
                backgroundColor: 'white',
              }}
            >
              <h2 style={{ marginTop: 0 }}>{listing.title}</h2>

              <p><strong>Airport:</strong> {listing.airport_name} ({listing.airport_code})</p>
              <p><strong>Location:</strong> {listing.city}, {listing.state}</p>
              <p><strong>Type:</strong> {listing.listing_type} · {listing.ownership_type}</p>
              <p><strong>Size:</strong> {listing.square_feet ?? 'N/A'} sq ft · Door: {listing.door_width ?? '?'}′ W × {listing.door_height ?? '?'}′ H</p>
              <p>
                <strong>Price:</strong>{' '}
                {listing.asking_price
                  ? `$${listing.asking_price.toLocaleString()}`
                  : listing.monthly_lease
                    ? `$${listing.monthly_lease.toLocaleString()}/month`
                    : 'Contact for price'}
              </p>
              {listing.description && <p><strong>Description:</strong> {listing.description}</p>}
              <p><strong>Contact:</strong> {listing.contact_name} — {listing.contact_email}{listing.contact_phone ? ` · ${listing.contact_phone}` : ''}</p>

              <ApproveRejectButtons id={listing.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
