import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import MessageButton from './MessageButton'
import ShowingRequestButton from '@/app/components/ShowingRequestButton'

export const dynamic = 'force-dynamic'


type PageProps = { params: Promise<{ id: string }> }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

function photoUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/listing-photos/${path}`
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const { data } = await supabase.from('broker_profiles').select('full_name, brokerage').eq('id', id).single()
  if (!data) return { title: 'Broker Not Found | Hangar Marketplace' }
  return {
    title: `${data.full_name}, ${data.brokerage} | Hangar Marketplace`,
    description: `View ${data.full_name}'s verified broker profile and hangar listings on Hangar Marketplace.`,
  }
}

export default async function BrokerProfilePage({ params }: PageProps) {
  const { id } = await params

  // Get current user (if logged in) for Message button
  const serverSupabase = await createServerClient()
  const { data: { user: currentUser } } = await serverSupabase.auth.getUser()

  const { data: broker } = await supabase
    .from('broker_profiles')
    .select('id, user_id, full_name, brokerage, phone, contact_email, website, bio, license_state, avatar_url, created_at, is_verified, specialty_airports')
    .eq('id', id)
    .single()

  if (!broker) notFound()

  // Listings posted by this broker's user_id
  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, airport_code, city, state, listing_type, asking_price, monthly_lease, square_feet, listing_photos(storage_path, display_order)')
    .eq('broker_profile_id', id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  const safeListings = (listings ?? []) as Array<{
    id: string
    title: string
    airport_code: string
    city: string
    state: string
    listing_type: string
    asking_price: number | null
    monthly_lease: number | null
    square_feet: number | null
    listing_photos: { storage_path: string; display_order: number }[]
  }>

  return (
    <div style={{ maxWidth: '900px' }}>
      <Link href="/" style={{ color: '#6366f1', textDecoration: 'none', fontSize: '0.875rem' }}>
        ← Browse listings
      </Link>

      {/* Broker header card */}
      <div style={{
        backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px',
        padding: '2rem', margin: '1.25rem 0 2rem', display: 'flex',
        gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start',
      }}>
        {/* Avatar */}
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%', flexShrink: 0,
          backgroundColor: '#1a3a5c', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: 'white', fontSize: '2rem', fontWeight: '700',
          overflow: 'hidden', border: '3px solid #e5e7eb',
        }}>
          {broker.avatar_url ? (
            <img
              src={broker.avatar_url}
              alt={broker.full_name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            broker.full_name.charAt(0).toUpperCase()
          )}
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{broker.full_name}</h1>
            {(broker as { is_verified?: boolean }).is_verified && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem',
                fontWeight: '700', backgroundColor: '#dbeafe', color: '#1e40af',
                border: '1px solid #bfdbfe',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Verified Broker
              </span>
            )}
          </div>

          <p style={{ margin: '0 0 0.5rem', fontWeight: '600', color: '#374151' }}>{broker.brokerage}</p>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
            Licensed in {broker.license_state} · Member since {new Date(broker.created_at).getFullYear()}
          </p>

          {/* Contact buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {currentUser && currentUser.id !== (broker as { user_id?: string }).user_id ? (
              <MessageButton
                brokerProfileId={broker.id}
                brokerName={broker.full_name}
                currentUserId={currentUser.id}
              />
            ) : !currentUser ? (
              <a
                href={`/signup?redirect=/broker/${broker.id}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                  padding: '0.6rem 1.25rem',
                  backgroundColor: '#6366f1', color: 'white',
                  border: 'none', borderRadius: '8px',
                  fontWeight: '600', fontSize: '0.875rem',
                  textDecoration: 'none', cursor: 'pointer',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Sign in to message
              </a>
            ) : null}
            {/* Request a showing — shown to all visitors */}
            {(!currentUser || currentUser.id !== (broker as { user_id?: string }).user_id) && (
              <ShowingRequestButton
                brokerProfileId={broker.id}
                brokerName={broker.full_name}
              />
            )}
            {broker.phone && (
              <a href={`tel:${broker.phone}`} style={contactBtnStyle}>
                📞 {broker.phone}
              </a>
            )}
            {(broker as { contact_email?: string | null }).contact_email && (
              <a href={`mailto:${(broker as { contact_email?: string | null }).contact_email}`} style={contactBtnStyle}>
                ✉️ {(broker as { contact_email?: string | null }).contact_email}
              </a>
            )}
            {broker.website && (
              <a href={broker.website} target="_blank" rel="noopener noreferrer" style={contactBtnStyle}>
                🌐 Website ↗
              </a>
            )}
          </div>

          {/* Specialty airports */}
          {((broker as { specialty_airports?: string[] }).specialty_airports ?? []).length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ margin: '0 0 0.4rem', fontSize: '0.72rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Specialty Airports
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {((broker as { specialty_airports?: string[] }).specialty_airports ?? []).map(code => (
                  <Link key={code} href={`/hangars/airport/${code}`}
                    style={{
                      display: 'inline-block', padding: '0.25rem 0.65rem',
                      backgroundColor: '#eff6ff', color: '#1d4ed8',
                      border: '1px solid #bfdbfe', borderRadius: '999px',
                      fontSize: '0.775rem', fontWeight: '700', textDecoration: 'none',
                    }}
                  >
                    {code}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bio */}
      {broker.bio && (
        <div style={{
          backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px',
          padding: '1.25rem', marginBottom: '2rem',
        }}>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: '#374151' }}>About</h2>
          <p style={{ margin: 0, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {broker.bio}
          </p>
        </div>
      )}

      {/* Listings */}
      <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#111827' }}>
        {safeListings.length > 0
          ? `${safeListings.length} active listing${safeListings.length !== 1 ? 's' : ''}`
          : 'Listings'}
      </h2>

      {safeListings.length === 0 ? (
        <div style={{
          backgroundColor: 'white', border: '1px dashed #d1d5db', borderRadius: '10px',
          padding: '3rem', textAlign: 'center', color: '#6b7280',
        }}>
          <p style={{ margin: 0 }}>No active listings right now. Check back soon.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {safeListings.map(listing => {
            const sortedPhotos = [...(listing.listing_photos ?? [])].sort((a, b) => a.display_order - b.display_order)
            const cover = sortedPhotos[0]?.storage_path
            const price = listing.asking_price
              ? `$${listing.asking_price.toLocaleString()}`
              : listing.monthly_lease
                ? `$${listing.monthly_lease.toLocaleString()}/mo`
                : 'Contact for price'
            const typeColors =
              listing.listing_type === 'sale'  ? { bg: '#dbeafe', text: '#1e40af' } :
              listing.listing_type === 'space' ? { bg: '#fef3c7', text: '#92400e' } :
                                                  { bg: '#dcfce7', text: '#166534' }
            const typeLabel =
              listing.listing_type === 'sale' ? 'For Sale' :
              listing.listing_type === 'space' ? 'Space Available' : 'For Lease'

            return (
              <Link key={listing.id} href={`/listing/${listing.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}>
                <div
                  className="hover-card"
                  style={{
                    backgroundColor: 'white', border: '1px solid #e5e7eb',
                    borderRadius: '8px', overflow: 'hidden',
                    transition: 'box-shadow 0.15s, border-color 0.15s',
                  }}
                >
                  <div style={{ height: '160px', backgroundColor: '#f3f4f6', overflow: 'hidden' }}>
                    {cover ? (
                      <img src={photoUrl(cover)} alt={listing.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.8rem' }}>
                        No photo
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.25rem', marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '1rem', color: '#111827' }}>{price}</span>
                      <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '600', backgroundColor: typeColors.bg, color: typeColors.text, whiteSpace: 'nowrap' }}>
                        {typeLabel}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 0.2rem', fontWeight: '600', fontSize: '0.875rem', color: '#111827', lineHeight: 1.3 }}>
                      {listing.title}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.775rem', color: '#6b7280' }}>
                      {listing.airport_code} · {listing.city}, {listing.state}
                    </p>
                    {listing.square_feet && (
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
                        {listing.square_feet.toLocaleString()} sq ft
                      </p>
                    )}
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

const contactBtnStyle: React.CSSProperties = {
  display: 'inline-block', padding: '0.4rem 0.85rem',
  border: '1px solid #d1d5db', borderRadius: '6px',
  backgroundColor: '#f9fafb', color: '#374151',
  fontSize: '0.825rem', fontWeight: '500', textDecoration: 'none',
}
