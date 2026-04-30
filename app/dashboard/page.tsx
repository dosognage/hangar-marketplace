/**
 * Seller Dashboard
 *
 * Shows all listings submitted by the currently logged-in user.
 * Middleware already guarantees the user is authenticated before
 * this page renders.
 */

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import DeleteListingButton from '@/app/components/DeleteListingButton'
import ManageBillingButton from '@/app/components/ManageBillingButton'

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
  is_sponsored: boolean
  sponsored_until: string | null
  stripe_customer_id: string | null
  view_count: number
}

type Inquiry = {
  id: string
  listing_id: string
  buyer_name: string
  buyer_email: string
  buyer_phone: string | null
  message: string
  created_at: string
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft:    { label: 'Draft',          color: '#374151', bg: '#f3f4f6' },
  pending:  { label: 'Pending review', color: '#92400e', bg: '#fef3c7' },
  pending_payment: { label: 'Payment required', color: '#92400e', bg: '#fef3c7' },
  approved: { label: 'Live',           color: '#166534', bg: '#dcfce7' },
  rejected: { label: 'Rejected',       color: '#991b1b', bg: '#fee2e2' },
  sold:     { label: 'Sold',           color: '#0e7490', bg: '#cffafe' },
  closed:   { label: 'Lease closed',   color: '#0e7490', bg: '#cffafe' },
}

export default async function DashboardPage() {
  const supabase = await createServerClient()

  // Verify session server-side
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect('/login?next=/dashboard')
  }

  // Fetch this user's listings (drafts + published together — we split below).
  const { data: allListings, error } = await supabase
    .from('listings')
    .select('id, title, airport_name, airport_code, city, state, listing_type, asking_price, monthly_lease, status, created_at, is_sponsored, sponsored_until, stripe_customer_id, view_count')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const drafts   = (allListings ?? []).filter((l: Listing) => l.status === 'draft')
  const listings = (allListings ?? []).filter((l: Listing) => l.status !== 'draft')

  // Fetch inquiries for all of the user's listings (non-fatal)
  let inquiries: Inquiry[] = []
  if (listings && listings.length > 0) {
    const listingIds = listings.map((l: Listing) => l.id)
    const { data: inqData } = await supabase
      .from('inquiries')
      .select('id, listing_id, buyer_name, buyer_email, buyer_phone, message, created_at')
      .in('listing_id', listingIds)
      .order('created_at', { ascending: false })
    inquiries = (inqData ?? []) as Inquiry[]
  }

  // Fetch active hangar requests at the airports of approved listings
  type HangarRequest = {
    id: string
    contact_name: string
    airport_code: string
    airport_name: string
    aircraft_type: string | null
    wingspan_ft: number | null
    monthly_budget: number | null
    duration: string | null
    move_in_date: string | null
    is_priority: boolean
    created_at: string
  }
  let nearbyRequests: HangarRequest[] = []
  const approvedListings = (listings ?? []).filter((l: Listing) => l.status === 'approved')
  if (approvedListings.length > 0) {
    const airportCodes = [...new Set(approvedListings.map((l: Listing) => l.airport_code))]
    const { data: reqData } = await supabase
      .from('hangar_requests')
      .select('id, contact_name, airport_code, airport_name, aircraft_type, wingspan_ft, monthly_budget, duration, move_in_date, is_priority, created_at')
      .eq('status', 'active')
      .in('airport_code', airportCodes)
      .order('created_at', { ascending: false })
      .limit(20)
    nearbyRequests = (reqData ?? []) as HangarRequest[]
  }

  const displayName = user.user_metadata?.full_name ?? user.email ?? 'Seller'
  const isBroker = user.user_metadata?.is_broker === true

  // Profile completion check
  const hasName    = !!user.user_metadata?.full_name?.trim()
  const hasPhone   = !!user.user_metadata?.phone?.trim()
  const hasAvatar  = !!user.user_metadata?.avatar_url?.trim()
  const missingFields: string[] = []
  if (!hasName)   missingFields.push('name')
  if (!hasPhone)  missingFields.push('phone number')
  if (!hasAvatar) missingFields.push('profile photo')
  const profileComplete = missingFields.length === 0
  const completedCount  = 3 - missingFields.length

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

      {/* Broker upgrade banner */}
      {isBroker ? (
        <div style={{
          background: 'linear-gradient(135deg, #1a3a5c 0%, #1e40af 100%)',
          borderRadius: '12px', padding: '1.25rem 1.5rem',
          marginBottom: '1.75rem', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '1rem',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span style={{ color: 'white', fontWeight: '700', fontSize: '0.95rem' }}>Verified Broker Account</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                padding: '0.15rem 0.5rem', borderRadius: '999px',
                fontSize: '0.65rem', fontWeight: '700',
                backgroundColor: 'rgba(255,255,255,0.2)', color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
              }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Verified
              </span>
            </div>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem' }}>
              Access your broker analytics, inquiries, and profile from your dedicated dashboard.
            </p>
          </div>
          <Link href="/broker/dashboard" style={{
            display: 'inline-block', padding: '0.55rem 1.1rem',
            backgroundColor: 'white', color: '#1a3a5c',
            borderRadius: '8px', textDecoration: 'none', fontWeight: '700',
            fontSize: '0.85rem', whiteSpace: 'nowrap',
          }}>
            Broker Dashboard →
          </Link>
        </div>
      ) : (
        <div style={{
          backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: '10px', padding: '1rem 1.25rem',
          marginBottom: '1.75rem', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '0.75rem',
        }}>
          <div>
            <p style={{ margin: '0 0 0.2rem', fontWeight: '700', fontSize: '0.875rem', color: '#1e40af' }}>
              Are you a licensed real estate broker?
            </p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#3b82f6' }}>
              Apply for verification to get a public profile, verified badge, and auto-approval on listings.
            </p>
          </div>
          <Link href="/apply-broker" style={{
            display: 'inline-block', padding: '0.45rem 1rem',
            backgroundColor: '#1e40af', color: 'white',
            borderRadius: '6px', textDecoration: 'none', fontWeight: '600',
            fontSize: '0.8rem', whiteSpace: 'nowrap',
          }}>
            Apply for verification
          </Link>
        </div>
      )}

      {/* Profile completion banner */}
      {!profileComplete && (
        <div style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fcd34d',
          borderRadius: '10px',
          padding: '0.9rem 1.25rem',
          marginBottom: '1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: '220px' }}>
            {/* Progress dots */}
            <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: '9px', height: '9px', borderRadius: '50%',
                  backgroundColor: i < completedCount ? '#f59e0b' : '#fde68a',
                  border: '1px solid #f59e0b',
                }} />
              ))}
            </div>
            <div>
              <p style={{ margin: '0 0 0.1rem', fontWeight: '700', fontSize: '0.875rem', color: '#92400e' }}>
                Complete your profile ({completedCount}/3)
              </p>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#b45309' }}>
                Missing: {missingFields.join(', ')}. Buyers trust complete profiles more.
              </p>
            </div>
          </div>
          <Link href="/settings" style={{
            display: 'inline-block', padding: '0.4rem 0.95rem',
            backgroundColor: '#f59e0b', color: 'white',
            borderRadius: '6px', textDecoration: 'none', fontWeight: '600',
            fontSize: '0.8rem', whiteSpace: 'nowrap',
          }}>
            Complete profile →
          </Link>
        </div>
      )}

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

      {/* ── My Drafts ─────────────────────────────────────────────────── */}
      {/* Rendered above published listings so users see work-in-progress first. */}
      {drafts.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ marginBottom: '0.9rem' }}>
            <h2 style={{ margin: '0 0 0.2rem', fontSize: '1.05rem' }}>My Drafts</h2>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.85rem' }}>
              Unpublished listings only you can see. Pick one up where you left off and hit Publish when ready.
            </p>
          </div>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {drafts.map((draft: Listing) => (
              <div
                key={draft.id}
                style={{
                  backgroundColor: 'white',
                  border: '1px dashed #d1d5db',
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem' }}>
                      {draft.title || 'Untitled draft'}
                    </h3>
                    <span style={{
                      padding: '0.1rem 0.55rem', borderRadius: '999px',
                      fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase',
                      backgroundColor: '#f3f4f6', color: '#374151', letterSpacing: '0.04em',
                    }}>
                      Draft
                    </span>
                  </div>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '0.82rem' }}>
                    {draft.airport_code
                      ? `${draft.airport_name || 'Airport TBD'} (${draft.airport_code})`
                      : 'Airport not set yet'}
                    {draft.city && ` · ${draft.city}${draft.state ? `, ${draft.state}` : ''}`}
                    {' · Started '}
                    {new Date(draft.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Link href={`/listing/${draft.id}/edit`} style={{
                    fontSize: '0.82rem', color: 'white', backgroundColor: '#111827',
                    textDecoration: 'none', fontWeight: '600', whiteSpace: 'nowrap',
                    padding: '0.4rem 0.95rem', borderRadius: '6px',
                  }}>
                    Resume editing
                  </Link>
                  <DeleteListingButton listingId={draft.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!error && listings.length === 0 && drafts.length === 0 && (
        <div style={{
          backgroundColor: 'white', border: '1px dashed #d1d5db',
          borderRadius: '12px', padding: '4rem 2rem', textAlign: 'center',
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#d1d5db"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
            </svg>
          </div>
          <p style={{ fontSize: '1.15rem', fontWeight: '700', color: '#111827', margin: '0 0 0.5rem' }}>
            No listings yet
          </p>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 1.75rem', lineHeight: 1.6 }}>
            Submit your first hangar listing and it will appear here once reviewed.
          </p>
        </div>
      )}

      {listings.length > 0 && (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {listings.map((listing: Listing) => {
            const s = STATUS_LABELS[listing.status] ?? STATUS_LABELS.pending
            const listingInquiries = inquiries.filter((i: Inquiry) => i.listing_id === listing.id)
            const now = new Date()
            const isSponsored = listing.is_sponsored && listing.sponsored_until && new Date(listing.sponsored_until) > now
            const sponsoredUntilLabel = isSponsored && listing.sponsored_until
              ? new Date(listing.sponsored_until).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : null

            return (
              <div
                key={listing.id}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  overflow: 'hidden',
                }}
              >
                {/* Listing row */}
                <div style={{
                  padding: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <h2 style={{ margin: 0, fontSize: '1rem' }}>{listing.title}</h2>
                      <span style={{
                        padding: '0.15rem 0.6rem', borderRadius: '999px',
                        fontSize: '0.75rem', fontWeight: '600',
                        backgroundColor: s.bg, color: s.color,
                      }}>
                        {s.label}
                      </span>
                      {isSponsored && (
                        <span style={{
                          padding: '0.15rem 0.6rem', borderRadius: '999px',
                          fontSize: '0.75rem', fontWeight: '600',
                          backgroundColor: '#eef2ff', color: '#4338ca',
                        }}>
                          Sponsored · until {sponsoredUntilLabel}
                        </span>
                      )}
                      {listingInquiries.length > 0 && (
                        <span style={{
                          padding: '0.15rem 0.6rem', borderRadius: '999px',
                          fontSize: '0.75rem', fontWeight: '600',
                          backgroundColor: '#eff6ff', color: '#1e40af',
                        }}>
                          {listingInquiries.length} {listingInquiries.length === 1 ? 'inquiry' : 'inquiries'}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                      {listing.airport_name} ({listing.airport_code}) · {listing.city}, {listing.state}
                    </p>
                    <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                      {listing.listing_type === 'sale' ? 'For Sale' : listing.listing_type === 'space' ? 'Space Available' : 'For Lease'}
                      {listing.asking_price ? ` · $${listing.asking_price.toLocaleString()}` : ''}
                      {listing.monthly_lease ? ` · $${listing.monthly_lease.toLocaleString()}/mo` : ''}
                    </p>

                    {/* Stats row: views + inquiries */}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: '#6b7280' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        <strong style={{ color: '#111827' }}>{(listing.view_count ?? 0).toLocaleString()}</strong> view{listing.view_count !== 1 ? 's' : ''}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: '#6b7280' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        <strong style={{ color: '#111827' }}>{listingInquiries.length}</strong> inquir{listingInquiries.length !== 1 ? 'ies' : 'y'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {listing.status === 'approved' && (
                      <Link href={`/listing/${listing.id}`} style={{
                        fontSize: '0.8rem', color: '#6366f1', textDecoration: 'none',
                        fontWeight: '500', whiteSpace: 'nowrap',
                        padding: '0.35rem 0.85rem', border: '1px solid #c7d2fe', borderRadius: '6px',
                      }}>
                        View live →
                      </Link>
                    )}
                    {listing.status === 'approved' && !isSponsored && (
                      <Link href={`/listing/${listing.id}#sponsor`} style={{
                        fontSize: '0.8rem', color: '#6366f1', textDecoration: 'none',
                        fontWeight: '500', whiteSpace: 'nowrap',
                        padding: '0.35rem 0.85rem',
                        border: '1px solid #c7d2fe', borderRadius: '6px',
                        backgroundColor: 'white',
                      }}>
                        Sponsor →
                      </Link>
                    )}
                    {listing.stripe_customer_id && (
                      <ManageBillingButton listingId={listing.id} />
                    )}
                    <Link href={`/listing/${listing.id}/edit`} style={{
                      fontSize: '0.8rem', color: '#374151', textDecoration: 'none',
                      fontWeight: '500', whiteSpace: 'nowrap',
                      padding: '0.35rem 0.85rem', border: '1px solid #d1d5db', borderRadius: '6px',
                    }}>
                      Edit
                    </Link>
                    {listing.status !== 'sold' && listing.status !== 'closed' && (
                      <Link href={`/listing/${listing.id}/mark-sold`} style={{
                        fontSize: '0.8rem', color: '#15803d', textDecoration: 'none',
                        fontWeight: 600, whiteSpace: 'nowrap',
                        padding: '0.35rem 0.85rem',
                        border: '1px solid #86efac', borderRadius: '6px',
                        backgroundColor: '#f0fdf4',
                      }}>
                        Sold
                      </Link>
                    )}
                    <DeleteListingButton listingId={listing.id} />
                  </div>
                </div>

                {/* Inquiries panel */}
                {listingInquiries.length > 0 && (
                  <div style={{ borderTop: '1px solid #f3f4f6', backgroundColor: '#fafafa' }}>
                    <div style={{ padding: '0.75rem 1.25rem 0.5rem', fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Inquiries
                    </div>
                    {listingInquiries.map((inq: Inquiry) => (
                      <div key={inq.id} style={{
                        padding: '0.75rem 1.25rem',
                        borderTop: '1px solid #f3f4f6',
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: '0.5rem',
                        alignItems: 'start',
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: '600', fontSize: '0.875rem', color: '#111827' }}>{inq.buyer_name}</span>
                            <a href={`mailto:${inq.buyer_email}`} style={{ fontSize: '0.8rem', color: '#6366f1', textDecoration: 'none' }}>{inq.buyer_email}</a>
                            {inq.buyer_phone && (
                              <a href={`tel:${inq.buyer_phone}`} style={{ fontSize: '0.8rem', color: '#6366f1', textDecoration: 'none' }}>{inq.buyer_phone}</a>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#374151', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            {inq.message}
                          </p>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap', paddingTop: '2px' }}>
                          {new Date(inq.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Hangar requests at your airports */}
      {nearbyRequests.length > 0 && (
        <div style={{ marginTop: '3rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.15rem' }}>
              Hangar Requests at Your Airports
            </h2>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
              Pilots actively looking for space at airports where you have a live listing.
            </p>
          </div>

          <div style={{ display: 'grid', gap: '0.875rem' }}>
            {nearbyRequests.map((req: HangarRequest) => (
              <div
                key={req.id}
                style={{
                  backgroundColor: 'white',
                  border: `1px solid ${req.is_priority ? '#fbbf24' : '#e5e7eb'}`,
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#111827' }}>
                      {req.contact_name}
                    </span>
                    <span style={{
                      padding: '0.1rem 0.5rem', borderRadius: '999px',
                      fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' as const,
                      backgroundColor: '#dbeafe', color: '#1e40af',
                    }}>
                      {req.airport_code}
                    </span>
                    {req.is_priority && (
                      <span style={{
                        padding: '0.1rem 0.5rem', borderRadius: '999px',
                        fontSize: '0.7rem', fontWeight: '700',
                        backgroundColor: '#fef3c7', color: '#92400e',
                      }}>
                        Priority
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '0.825rem' }}>
                    {req.airport_name}
                    {req.aircraft_type && ` · ${req.aircraft_type}`}
                    {req.wingspan_ft && ` · ${req.wingspan_ft}′ wingspan`}
                    {req.monthly_budget && ` · $${req.monthly_budget.toLocaleString()}/mo budget`}
                    {req.duration && ` · ${req.duration}`}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Link
                    href={`/requests?airport=${req.airport_code}`}
                    style={{
                      fontSize: '0.8rem', color: '#6366f1', textDecoration: 'none',
                      fontWeight: '500', whiteSpace: 'nowrap',
                      padding: '0.35rem 0.85rem', border: '1px solid #c7d2fe', borderRadius: '6px',
                    }}
                  >
                    View request →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#9ca3af' }}>
            <Link href="/requests" style={{ color: '#6366f1', textDecoration: 'none' }}>
              Browse all active requests →
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}
