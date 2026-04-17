export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'

type PageProps = { params: Promise<{ id: string }> }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

function photoUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/listing-photos/${path}`
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const { data } = await supabaseAdmin.from('broker_teams').select('name').eq('id', id).single()
  if (!data) return { title: 'Team Not Found | Hangar Marketplace' }
  return {
    title: `${data.name} | Hangar Marketplace`,
    description: `Browse listings and brokers from the ${data.name} team on Hangar Marketplace.`,
  }
}

export default async function TeamProfilePage({ params }: PageProps) {
  const { id } = await params

  const { data: team } = await supabaseAdmin
    .from('broker_teams')
    .select('id, name, description, website, logo_url, owner_profile_id, created_at')
    .eq('id', id)
    .single()

  if (!team) notFound()

  // Fetch team members
  const { data: members } = await supabaseAdmin
    .from('broker_profiles')
    .select('id, full_name, brokerage, avatar_url, is_verified, is_founding_broker, license_state')
    .eq('team_id', id)
    .order('created_at', { ascending: true })

  const safeMembers = (members ?? []) as Array<{
    id: string
    full_name: string
    brokerage: string
    avatar_url: string | null
    is_verified: boolean
    is_founding_broker: boolean
    license_state: string
  }>

  // Fetch all listings from team members
  const memberIds = safeMembers.map(m => m.id)
  const listings = memberIds.length > 0
    ? (await supabaseAdmin
        .from('listings')
        .select('id, title, airport_code, city, state, listing_type, asking_price, monthly_lease, square_feet, broker_profile_id, listing_photos(storage_path, display_order)')
        .in('broker_profile_id', memberIds)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
      ).data ?? []
    : []

  const safeListings = listings as Array<{
    id: string
    title: string
    airport_code: string
    city: string
    state: string
    listing_type: string
    asking_price: number | null
    monthly_lease: number | null
    square_feet: number | null
    broker_profile_id: string
    listing_photos: { storage_path: string; display_order: number }[]
  }>

  const memberMap = Object.fromEntries(safeMembers.map(m => [m.id, m]))

  return (
    <div style={{ maxWidth: '900px' }}>
      <Link href="/" style={{ color: '#6366f1', textDecoration: 'none', fontSize: '0.875rem' }}>
        ← Browse listings
      </Link>

      {/* Team header */}
      <div style={{
        backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px',
        padding: '2rem', margin: '1.25rem 0 2rem',
      }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Logo / Icon */}
          <div style={{
            width: '72px', height: '72px', borderRadius: '14px', flexShrink: 0,
            backgroundColor: '#1a3a5c', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'white', fontSize: '1.75rem', fontWeight: '700',
            overflow: 'hidden', border: '3px solid #e5e7eb',
          }}>
            {team.logo_url
              ? <img src={team.logo_url} alt={team.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : '🏢'
            }
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.6rem' }}>{team.name}</h1>
            {team.description && (
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#6b7280', lineHeight: 1.6 }}>{team.description}</p>
            )}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#9ca3af' }}>
              <span>🧑‍✈️ {safeMembers.length} broker{safeMembers.length !== 1 ? 's' : ''}</span>
              <span>🏠 {safeListings.length} listing{safeListings.length !== 1 ? 's' : ''}</span>
              {team.website && (
                <a href={team.website} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'none' }}>
                  {team.website.replace(/^https?:\/\//, '')} ↗
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Team members */}
      <h2 style={{ fontSize: '1rem', color: '#374151', margin: '0 0 0.75rem' }}>Team Members</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem', marginBottom: '2.5rem' }}>
        {safeMembers.map(member => (
          <Link
            key={member.id}
            href={`/broker/${member.id}`}
            style={{ textDecoration: 'none' }}
          >
            <div style={{
              backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px',
              padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center',
              transition: 'border-color 0.15s',
            }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                backgroundColor: '#1a3a5c', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '1.1rem', fontWeight: '700',
                border: '2px solid #e5e7eb',
              }}>
                {member.avatar_url
                  ? <img src={member.avatar_url} alt={member.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : member.full_name.charAt(0).toUpperCase()
                }
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.1rem' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#111827' }}>{member.full_name}</span>
                  {member.is_founding_broker && (
                    <span style={{ fontSize: '0.62rem', fontWeight: '700', backgroundColor: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a', borderRadius: '4px', padding: '0.1rem 0.35rem' }}>
                      ✦ FOUNDING
                    </span>
                  )}
                  {member.is_verified && (
                    <span style={{ fontSize: '0.62rem', fontWeight: '700', backgroundColor: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '0.1rem 0.35rem' }}>
                      ✓
                    </span>
                  )}
                  {member.id === team.owner_profile_id && (
                    <span style={{ fontSize: '0.62rem', fontWeight: '700', backgroundColor: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe', borderRadius: '4px', padding: '0.1rem 0.35rem' }}>
                      LEAD
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>
                  {member.brokerage} · {member.license_state}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Team listings */}
      {safeListings.length > 0 && (
        <>
          <h2 style={{ fontSize: '1rem', color: '#374151', margin: '0 0 0.75rem' }}>Listings</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {safeListings.map(listing => {
              const cover = [...(listing.listing_photos ?? [])].sort((a, b) => a.display_order - b.display_order)[0]
              const broker = memberMap[listing.broker_profile_id]
              const price = listing.asking_price
                ? `$${listing.asking_price.toLocaleString()}`
                : listing.monthly_lease
                  ? `$${listing.monthly_lease.toLocaleString()}/mo`
                  : 'Contact for price'

              return (
                <Link key={listing.id} href={`/listing/${listing.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px',
                    overflow: 'hidden', transition: 'box-shadow 0.15s',
                  }}>
                    {/* Photo */}
                    <div style={{ height: '160px', backgroundColor: '#f3f4f6', overflow: 'hidden', position: 'relative' }}>
                      {cover
                        ? <img src={photoUrl(cover.storage_path)} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '2rem' }}>🛩</div>
                      }
                      <span style={{
                        position: 'absolute', bottom: '6px', left: '6px',
                        fontSize: '0.7rem', fontWeight: '700',
                        backgroundColor: listing.listing_type === 'for_sale' ? '#dbeafe' : '#d1fae5',
                        color: listing.listing_type === 'for_sale' ? '#1e40af' : '#065f46',
                        padding: '0.15rem 0.5rem', borderRadius: '4px',
                      }}>
                        {listing.listing_type === 'for_sale' ? 'For Sale' : 'For Lease'}
                      </span>
                    </div>

                    <div style={{ padding: '0.875rem' }}>
                      <p style={{ margin: '0 0 0.2rem', fontWeight: '700', fontSize: '0.9rem', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {listing.title}
                      </p>
                      <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: '#6b7280' }}>
                        {listing.airport_code} · {listing.city}, {listing.state}
                        {listing.square_feet && ` · ${listing.square_feet.toLocaleString()} sq ft`}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#111827' }}>{price}</span>
                        {broker && (
                          <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{broker.full_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}

      {safeListings.length === 0 && (
        <p style={{ color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
          No active listings at this time.
        </p>
      )}
    </div>
  )
}
