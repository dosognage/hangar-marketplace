export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isAdminUser } from '@/lib/auth-admin'
import FeatureButton from '@/app/admin/FeatureButton'
import { Star } from 'lucide-react'

type Listing = {
  id: string
  title: string
  airport_code: string
  city: string
  state: string
  listing_type: string
  is_featured: boolean
  featured_until: string | null
  created_at: string
}

export default async function AdminFeaturedPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin/featured')
  if (!isAdminUser(user)) redirect('/')

  const { data: listings } = await supabaseAdmin
    .from('listings')
    .select('id, title, airport_code, city, state, listing_type, is_featured, featured_until, created_at')
    .eq('status', 'approved')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })

  const safeListings = (listings ?? []) as Listing[]
  const featured = safeListings.filter(l => l.is_featured)
  const notFeatured = safeListings.filter(l => !l.is_featured)

  function typeLabel(t: string) {
    return t === 'sale' ? 'For Sale' : t === 'space' ? 'Space Available' : 'For Lease'
  }

  function ListingRow({ listing }: { listing: Listing }) {
    const expired = listing.featured_until && new Date(listing.featured_until) < new Date()
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '0.75rem',
        padding: '0.85rem 1rem',
        border: `1px solid ${listing.is_featured && !expired ? '#fde68a' : '#e5e7eb'}`,
        borderRadius: '8px',
        backgroundColor: listing.is_featured && !expired ? '#fffbeb' : 'white',
      }}>
        <div>
          <p style={{ margin: 0, fontWeight: '600', fontSize: '0.875rem', color: '#111827' }}>
            {listing.title}
          </p>
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.775rem', color: '#6b7280' }}>
            {listing.airport_code} · {listing.city}, {listing.state} · {typeLabel(listing.listing_type)}
          </p>
        </div>
        <FeatureButton
          listingId={listing.id}
          isFeatured={listing.is_featured && !expired}
          featuredUntil={listing.featured_until}
        />
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 0.25rem' }}>Featured Listings</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>
            Featured listings appear at the top of browse results with a star badge.
          </p>
        </div>
        <Link href="/admin" style={{
          marginLeft: 'auto', fontSize: '0.825rem', color: '#6366f1',
          textDecoration: 'none', whiteSpace: 'nowrap',
        }}>
          ← Back to Admin
        </Link>
      </div>

      {/* Currently featured */}
      <h2 style={{ fontSize: '0.95rem', color: '#374151', margin: '0 0 0.75rem' }}>
        <Star size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.35rem' }} /> Currently Featured ({featured.length})
      </h2>
      {featured.length === 0 ? (
        <div style={{
          padding: '2rem', textAlign: 'center', color: '#9ca3af',
          border: '1px dashed #d1d5db', borderRadius: '8px', marginBottom: '2rem',
        }}>
          No featured listings right now.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '2rem' }}>
          {featured.map(l => <ListingRow key={l.id} listing={l} />)}
        </div>
      )}

      {/* All approved listings */}
      <h2 style={{ fontSize: '0.95rem', color: '#374151', margin: '0 0 0.75rem' }}>
        All Approved Listings ({notFeatured.length})
      </h2>
      {notFeatured.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', border: '1px dashed #d1d5db', borderRadius: '8px' }}>
          No approved listings.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {notFeatured.map(l => <ListingRow key={l.id} listing={l} />)}
        </div>
      )}
    </div>
  )
}
