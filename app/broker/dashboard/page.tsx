/**
 * Verified Broker Dashboard
 *
 * Only accessible to users with is_broker = true in their user_metadata.
 * Shows performance analytics, listings management, and broker-specific tools.
 */

export const dynamic = 'force-dynamic'

import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import AvatarUpload from './AvatarUpload'
import BrokerProfileForm from './BrokerProfileForm'
import BrokerAnalyticsDashboard from '@/app/components/BrokerAnalyticsDashboard'
import SponsorButton from '@/app/components/SponsorButton'
import TeamSection from './TeamSection'
import DashboardTabs from './DashboardTabs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

type SearchParams = Promise<{ tab?: string }>

export default async function BrokerDashboardPage({ searchParams }: { searchParams: SearchParams }) {
  // Default to the listings card view; switch to analytics on ?tab=analytics.
  const params = await searchParams
  const activeTab: 'listings' | 'analytics' = params.tab === 'analytics' ? 'analytics' : 'listings'
  const supabase = await createServerClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) redirect('/login?next=/broker/dashboard')

  const isBroker = user.user_metadata?.is_broker === true
  if (!isBroker) redirect('/apply-broker')

  const brokerProfileId = user.user_metadata?.broker_profile_id as string | undefined

  // Fetch broker profile
  const { data: profile } = await supabaseAdmin
    .from('broker_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) redirect('/apply-broker')

  // Fetch team + members if broker is on a team
  const teamId = (profile as { team_id?: string | null }).team_id
  let currentTeam: { id: string; name: string; description: string | null; website: string | null; logo_url: string | null; owner_profile_id: string } | null = null
  let teamMembers: { id: string; full_name: string; brokerage: string; avatar_url: string | null }[] = []

  if (teamId) {
    const [{ data: teamData }, { data: membersData }] = await Promise.all([
      supabaseAdmin.from('broker_teams').select('id, name, description, website, logo_url, owner_profile_id').eq('id', teamId).maybeSingle(),
      supabaseAdmin.from('broker_profiles').select('id, full_name, brokerage, avatar_url').eq('team_id', teamId),
    ])
    currentTeam = teamData ?? null
    teamMembers = (membersData ?? []) as typeof teamMembers
  }

  // Fetch all listings tagged to this broker profile
  const { data: listings } = await supabaseAdmin
    .from('listings')
    .select('id, title, airport_code, city, state, listing_type, asking_price, monthly_lease, status, created_at, view_count, is_sponsored, sponsored_until, stripe_customer_id')
    .eq('broker_profile_id', brokerProfileId ?? profile.id)
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
    status: string
    created_at: string
    view_count: number
    is_sponsored: boolean
    sponsored_until: string | null
    stripe_customer_id: string | null
  }>

  // Fetch inquiries for all broker listings
  const listingIds = safeListings.map(l => l.id)
  let inquiries: Array<{
    id: string
    listing_id: string
    buyer_name: string
    buyer_email: string
    buyer_phone: string | null
    message: string
    created_at: string
  }> = []

  if (listingIds.length > 0) {
    const { data: inqData } = await supabaseAdmin
      .from('inquiries')
      .select('id, listing_id, buyer_name, buyer_email, buyer_phone, message, created_at')
      .in('listing_id', listingIds)
      .order('created_at', { ascending: false })
    inquiries = (inqData ?? []) as typeof inquiries
  }

  // Compute stats
  const totalViews     = safeListings.reduce((s, l) => s + (l.view_count ?? 0), 0)
  const totalInquiries = inquiries.length
  const liveCount      = safeListings.filter(l => l.status === 'approved').length
  const pendingCount   = safeListings.filter(l => l.status === 'pending').length
  const memberSince    = new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
    pending:  { label: 'Pending review', color: '#92400e', bg: '#fef3c7' },
    approved: { label: 'Live',           color: '#166534', bg: '#dcfce7' },
    rejected: { label: 'Rejected',       color: '#991b1b', bg: '#fee2e2' },
  }

  // ── Setup progress (for banner) ─────────────────────────────────────────────
  const airports = (profile as { specialty_airports?: string[] }).specialty_airports ?? []
  const bio      = (profile as { bio?: string }).bio ?? ''
  const radius   = (profile as { alert_radius_miles?: number }).alert_radius_miles ?? 0
  const setupChecks = [
    !!profile.avatar_url,
    !!(profile.brokerage && profile.phone && (profile as { contact_email?: string }).contact_email),
    bio.trim().length > 10,
    airports.length > 0,
    radius > 0,
    safeListings.length > 0,
  ]
  const setupDone  = setupChecks.filter(Boolean).length
  const setupTotal = setupChecks.length
  const setupPct   = Math.round((setupDone / setupTotal) * 100)
  const setupComplete = setupDone === setupTotal

  return (
    <div>
      {/* ── Setup progress banner ── */}
      {!setupComplete && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '0.9rem 1.25rem',
          marginBottom: '1.25rem',
          backgroundColor: 'white',
          border: '1px solid #dbeafe',
          borderRadius: '12px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          flexWrap: 'wrap',
        }}>
          {/* Progress ring visual */}
          <div style={{ position: 'relative', flexShrink: 0, width: '44px', height: '44px' }}>
            <svg width="44" height="44" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="18" fill="none" stroke="#e0e7ff" strokeWidth="4"/>
              <circle
                cx="22" cy="22" r="18" fill="none"
                stroke="#3b82f6" strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 18}`}
                strokeDashoffset={`${2 * Math.PI * 18 * (1 - setupPct / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 22 22)"
              />
            </svg>
            <span style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.65rem', fontWeight: '800', color: '#1d4ed8',
            }}>
              {setupPct}%
            </span>
          </div>

          <div style={{ flex: 1, minWidth: '160px' }}>
            <p style={{ margin: '0 0 0.15rem', fontSize: '0.875rem', fontWeight: '700', color: '#111827' }}>
              Complete your broker setup — {setupDone}/{setupTotal} steps done
            </p>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#6b7280' }}>
              Finish setting up your profile so pilots can find you and you start receiving request alerts.
            </p>
          </div>

          <a
            href="/broker/dashboard/setup"
            style={{
              flexShrink: 0,
              padding: '0.45rem 1rem',
              backgroundColor: '#1a3a5c',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '7px',
              fontSize: '0.8rem',
              fontWeight: '600',
              whiteSpace: 'nowrap',
            }}
          >
            Continue setup →
          </a>
        </div>
      )}

      {/* Hero header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a3a5c 0%, #1e40af 100%)',
        borderRadius: '16px',
        padding: '2rem 2.5rem',
        marginBottom: '2rem',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        flexWrap: 'wrap',
      }}>
        {/* Avatar with upload */}
        <AvatarUpload
          userId={user.id}
          profileId={profile.id}
          currentAvatarUrl={profile.avatar_url ?? null}
          displayName={profile.full_name}
        />

        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'white' }}>{profile.full_name}</h1>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.2rem 0.65rem', borderRadius: '999px',
              fontSize: '0.72rem', fontWeight: '700',
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.35)',
              color: 'white',
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              Verified Broker
            </span>
          </div>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem' }}>
            {profile.brokerage} · Licensed in {profile.license_state} · Member since {memberSince}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href={`/broker/${profile.id}`} style={{
            display: 'inline-block', padding: '0.55rem 1.1rem',
            backgroundColor: 'rgba(255,255,255,0.15)', color: 'white',
            borderRadius: '8px', textDecoration: 'none', fontWeight: '600',
            fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.3)',
          }}>
            View public profile →
          </Link>
          <Link href="/submit" style={{
            display: 'inline-block', padding: '0.55rem 1.1rem',
            backgroundColor: 'white', color: '#1a3a5c',
            borderRadius: '8px', textDecoration: 'none', fontWeight: '700',
            fontSize: '0.85rem',
          }}>
            + New listing
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {([
          {
            label: 'Total views', value: totalViews.toLocaleString(),
            color: '#dbeafe', iconColor: '#1e40af', text: '#1e40af',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            ),
          },
          {
            label: 'Total inquiries', value: totalInquiries.toLocaleString(),
            color: '#dcfce7', iconColor: '#166534', text: '#166534',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            ),
          },
          {
            label: 'Live listings', value: liveCount.toLocaleString(),
            color: '#eff6ff', iconColor: '#1e40af', text: '#1e40af',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ),
          },
          {
            label: 'Pending review', value: pendingCount.toLocaleString(),
            color: '#fef3c7', iconColor: '#92400e', text: '#92400e',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            ),
          },
        ] as Array<{ label: string; value: string; color: string; iconColor: string; text: string; icon: React.ReactNode }>).map(stat => (
          <div key={stat.label} style={{
            backgroundColor: 'white', border: '1px solid #e5e7eb',
            borderRadius: '12px', padding: '1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.85rem',
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '10px',
              backgroundColor: stat.color, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: stat.iconColor,
            }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: stat.text, lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.2rem' }}>
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent inquiries */}
      {inquiries.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.05rem', color: '#111827' }}>
            Recent Inquiries
          </h2>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {inquiries.slice(0, 5).map(inq => {
              const listing = safeListings.find(l => l.id === inq.listing_id)
              return (
                <div key={inq.id} style={{
                  backgroundColor: 'white', border: '1px solid #e5e7eb',
                  borderRadius: '10px', padding: '1rem 1.25rem',
                  display: 'grid', gridTemplateColumns: '1fr auto',
                  gap: '0.75rem', alignItems: 'start',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#111827' }}>{inq.buyer_name}</span>
                      <a href={`mailto:${inq.buyer_email}`} style={{ fontSize: '0.8rem', color: '#6366f1', textDecoration: 'none' }}>{inq.buyer_email}</a>
                      {inq.buyer_phone && (
                        <a href={`tel:${inq.buyer_phone}`} style={{ fontSize: '0.8rem', color: '#6366f1', textDecoration: 'none' }}>{inq.buyer_phone}</a>
                      )}
                    </div>
                    {listing && (
                      <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                        Re: <Link href={`/listing/${listing.id}`} style={{ color: '#6366f1', textDecoration: 'none' }}>{listing.title}</Link>
                      </p>
                    )}
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151', lineHeight: 1.5 }}>{inq.message}</p>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap', paddingTop: '2px' }}>
                    {new Date(inq.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pill toggle between the two views */}
      <DashboardTabs activeTab={activeTab} listingsCount={safeListings.length} />

      {/* Listings card view — shown only when activeTab === 'listings' */}
      {activeTab === 'listings' && (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', color: '#111827' }}>Your Listings</h2>
          <Link href="/submit" style={{
            padding: '0.45rem 1rem', backgroundColor: '#111827', color: 'white',
            borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '0.8rem',
          }}>
            + New listing
          </Link>
        </div>

        {safeListings.length === 0 ? (
          <div style={{
            backgroundColor: 'white', border: '1px dashed #d1d5db',
            borderRadius: '12px', padding: '3rem', textAlign: 'center', color: '#6b7280',
          }}>
            <p style={{ margin: '0 0 1rem' }}>You have not posted any listings yet.</p>
            <Link href="/submit" style={{
              padding: '0.55rem 1.25rem', backgroundColor: '#111827', color: 'white',
              borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '0.875rem',
            }}>
              Post your first listing
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.875rem' }}>
            {safeListings.map(listing => {
              const s = STATUS_STYLE[listing.status] ?? STATUS_STYLE.pending
              const listingInquiries = inquiries.filter(i => i.listing_id === listing.id)
              const now = new Date()
              const isSponsored = listing.is_sponsored && listing.sponsored_until && new Date(listing.sponsored_until) > now
              const price = listing.asking_price
                ? `$${listing.asking_price.toLocaleString()}`
                : listing.monthly_lease
                  ? `$${listing.monthly_lease.toLocaleString()}/mo`
                  : 'Contact for price'

              return (
                <div key={listing.id} className="broker-listing-card" style={{
                  position: 'relative',
                  backgroundColor: 'white', border: '1px solid #e5e7eb',
                  borderRadius: '10px', padding: '1rem 1.25rem',
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem',
                  cursor: 'pointer',
                }}>
                  {/* Stretched link — covers the whole card, sits behind buttons.
                      Includes the active tab so the listing-detail back button
                      returns the broker to the same view they were on. */}
                  <Link
                    href={`/listing/${listing.id}?from=broker-dashboard&tab=listings`}
                    style={{ position: 'absolute', inset: 0, zIndex: 0, borderRadius: '10px' }}
                    aria-label={`View listing: ${listing.title}`}
                  />

                  {/* Card content — z-index: 1 so it sits above the stretched link */}
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#111827' }}>{listing.title}</span>
                      <span style={{
                        padding: '0.12rem 0.55rem', borderRadius: '999px',
                        fontSize: '0.72rem', fontWeight: '600',
                        backgroundColor: s.bg, color: s.color,
                      }}>
                        {s.label}
                      </span>
                      {isSponsored && (
                        <span style={{
                          padding: '0.12rem 0.55rem', borderRadius: '999px',
                          fontSize: '0.72rem', fontWeight: '600',
                          backgroundColor: '#eef2ff', color: '#4338ca',
                        }}>
                          Sponsored
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 0.25rem', color: '#6b7280', fontSize: '0.825rem' }}>
                      {listing.airport_code} · {listing.city}, {listing.state} · {price}
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.78rem', color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                        <strong style={{ color: '#111827' }}>{(listing.view_count ?? 0).toLocaleString()}</strong> views
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        <strong style={{ color: '#111827' }}>{listingInquiries.length}</strong> {listingInquiries.length === 1 ? 'inquiry' : 'inquiries'}
                      </span>
                    </div>
                  </div>

                  {/* Actions — z-index: 2 so always clickable above the stretched link */}
                  <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <SponsorButton
                      listingId={listing.id}
                      sponsoredUntil={listing.sponsored_until}
                      hasStripeCustomer={!!listing.stripe_customer_id}
                    />
                    {listing.status === 'sold' || listing.status === 'closed' ? (
                      <Link href={`/listing/${listing.id}/mark-sold`} className="broker-edit-btn" style={{
                        fontSize: '0.8rem', color: '#0e7490', textDecoration: 'none',
                        fontWeight: 600, padding: '0.3rem 0.75rem',
                        border: '1px solid #67e8f9', borderRadius: '6px',
                        backgroundColor: '#ecfeff',
                      }}>
                        View sale recap →
                      </Link>
                    ) : (
                      <>
                        <Link href={`/listing/${listing.id}/edit`} className="broker-edit-btn" style={{
                          fontSize: '0.8rem', color: '#374151', textDecoration: 'none',
                          fontWeight: '500', padding: '0.3rem 0.75rem',
                          border: '1px solid #d1d5db', borderRadius: '6px',
                          backgroundColor: 'white',
                        }}>
                          Edit
                        </Link>
                        <Link href={`/listing/${listing.id}/mark-sold`} className="broker-edit-btn" style={{
                          fontSize: '0.8rem', color: '#15803d', textDecoration: 'none',
                          fontWeight: 600, padding: '0.3rem 0.75rem',
                          border: '1px solid #86efac', borderRadius: '6px',
                          backgroundColor: '#f0fdf4',
                        }}>
                          Mark as Sold
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      )}

      {/* Analytics view — shown only when activeTab === 'analytics' */}
      {activeTab === 'analytics' && (
        <BrokerAnalyticsDashboard
          brokerProfileId={brokerProfileId ?? profile.id}
          supabaseUrl={SUPABASE_URL}
        />
      )}

      {/* Team section — always visible regardless of tab */}
      <div style={{ marginTop: '2rem' }}>
        <TeamSection
          profileId={profile.id}
          initialTeam={currentTeam}
          initialMembers={teamMembers}
        />
      </div>

      {/* Profile edit section */}
      <div style={{
        marginTop: '2rem', backgroundColor: 'white',
        border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem',
      }}>
        <div style={{ marginBottom: '0.35rem' }}>
          <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem', color: '#111827' }}>Edit Your Public Profile</h2>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
            Changes appear immediately on your{' '}
            <Link href={`/broker/${profile.id}`} style={{ color: '#6366f1', textDecoration: 'none' }}>
              public broker page
            </Link>.
            {' '}To update your name or login email, visit{' '}
            <Link href="/settings" style={{ color: '#6366f1', textDecoration: 'none' }}>Profile Settings</Link>.
          </p>
        </div>

        {/* Read-only fields */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', margin: '1.1rem 0', padding: '0.9rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
          {[
            ['Name', profile.full_name],
            ['Brokerage', profile.brokerage],
            ['License state', profile.license_state],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>{label}</div>
              <div style={{ fontSize: '0.85rem', color: '#374151' }}>{value}</div>
            </div>
          ))}
        </div>

        <BrokerProfileForm
          profileId={profile.id}
          currentBrokerage={profile.brokerage ?? null}
          currentPhone={profile.phone ?? null}
          currentEmail={(profile as { contact_email?: string | null }).contact_email ?? null}
          currentWebsite={profile.website ?? null}
          currentBio={profile.bio ?? null}
          currentLicenseNumber={(profile as { license_number?: string | null }).license_number ?? null}
          currentSpecialtyAirports={(profile as { specialty_airports?: string[] }).specialty_airports ?? []}
          currentAlertRadius={(profile as { alert_radius_miles?: number }).alert_radius_miles ?? 100}
          currentHideEmail={(profile as { hide_email?: boolean }).hide_email ?? false}
          isVerified={(profile as { is_verified?: boolean }).is_verified ?? false}
        />
      </div>
    </div>
  )
}
