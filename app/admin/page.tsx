/**
 * Admin Review Page
 *
 * The middleware already ensures only users in ADMIN_EMAILS can reach
 * this page. We double-check here server-side for defence in depth.
 */

export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import BrokerApplicationButtons from './BrokerApplicationButtons'
import ReGeocodeButton from './RegeoCodeButton'
import AdminListingsManager from './AdminListingsManager'
import AdminHomesManager, { type AdminHomeListing } from './AdminHomesManager'
import AdminUsersManager, { type AdminUser } from './AdminUsersManager'
import AdminBrokersManager, { type AdminBrokerProfile } from './AdminBrokersManager'
import AdminRequestsManager, { type AdminRequest } from './AdminRequestsManager'
import { Star, Building2, Users, Home, MessageSquare } from 'lucide-react'

type BrokerApp = {
  id: string
  user_id: string
  email: string
  full_name: string
  brokerage: string
  license_state: string | null
  license_number: string | null
  phone: string | null
  website: string | null
  bio: string | null
  is_unlicensed: boolean
  status: string
  created_at: string
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

  // Fetch hangar listings (admin sees everything, filterable client-side)
  const { data: allListings, error: listingsError } = await supabaseAdmin
    .from('listings')
    .select('id, title, airport_name, airport_code, city, state, listing_type, ownership_type, asking_price, monthly_lease, square_feet, status, is_sample, is_featured, is_sponsored, contact_name, contact_email, contact_phone, created_at, view_count, broker_profile_id')
    .in('property_type', ['hangar'])
    .order('created_at', { ascending: false })

  // Fetch airport home / land / fly-in community listings
  const { data: homeListings } = await supabaseAdmin
    .from('listings')
    .select('id, title, airport_name, airport_code, city, state, property_type, listing_type, asking_price, monthly_lease, bedrooms, bathrooms, home_sqft, lot_acres, has_runway_access, airpark_name, status, is_sample, contact_name, contact_email, contact_phone, created_at, view_count')
    .in('property_type', ['airport_home', 'land', 'fly_in_community'])
    .order('created_at', { ascending: false })

  // Fetch pending broker applications
  const { data: brokerApps } = await supabaseAdmin
    .from('broker_applications')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  // Fetch all auth users (paginated — Supabase returns up to 1000 per page)
  const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  const authUsers = authData?.users ?? []

  // Listing counts per user_id
  const { data: listingCounts } = await supabaseAdmin
    .from('listings')
    .select('user_id')
    .not('user_id', 'is', null)

  const countByUser: Record<string, number> = {}
  for (const row of listingCounts ?? []) {
    if (row.user_id) countByUser[row.user_id] = (countByUser[row.user_id] ?? 0) + 1
  }

  // Fetch all hangar requests
  const { data: hangarRequests } = await supabaseAdmin
    .from('hangar_requests')
    .select('id, contact_name, contact_email, contact_phone, airport_code, airport_name, city, state, aircraft_type, wingspan_ft, monthly_budget, duration, move_in_date, notes, status, is_priority, created_at')
    .order('created_at', { ascending: false })

  // Broker profiles — full detail for admin broker panel + keyed by user_id for users table
  const { data: brokerProfiles } = await supabaseAdmin
    .from('broker_profiles')
    .select('id, user_id, full_name, brokerage, license_state, license_number, is_hidden, is_verified, is_founding_broker, avatar_url, created_at')
    .order('created_at', { ascending: false })

  const brokerProfileByUser: Record<string, string> = {}
  for (const bp of brokerProfiles ?? []) {
    if (bp.user_id) brokerProfileByUser[bp.user_id] = bp.id
  }

  // Shape into AdminBrokerProfile[] with listing counts
  const adminBrokers: AdminBrokerProfile[] = (brokerProfiles ?? []).map(bp => ({
    id:            bp.id,
    user_id:       bp.user_id,
    full_name:     bp.full_name,
    brokerage:     bp.brokerage,
    license_state:  bp.license_state,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    license_number: (bp as any).license_number ?? null,
    is_hidden:           bp.is_hidden ?? false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    is_verified:         (bp as any).is_verified ?? false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    is_founding_broker:  (bp as any).is_founding_broker ?? false,
    avatar_url:     bp.avatar_url ?? null,
    created_at:     bp.created_at,
    listing_count:  countByUser[bp.user_id ?? ''] ?? 0,
  }))

  // Shape into AdminUser[]
  const adminUsers: AdminUser[] = authUsers.map(u => ({
    id:                u.id,
    email:             u.email ?? '(no email)',
    display_name:      (u.user_metadata?.full_name as string | null) ?? null,
    created_at:        u.created_at,
    last_sign_in:      u.last_sign_in_at ?? null,
    is_broker:         u.user_metadata?.is_broker === true,
    broker_profile_id: (brokerProfileByUser[u.id] ?? null),
    listing_count:     countByUser[u.id] ?? 0,
    confirmed:         !!u.email_confirmed_at,
  })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  if (listingsError) {
    return (
      <div>
        <h1>Admin</h1>
        <p style={{ color: '#dc2626' }}>Failed to load listings.</p>
        <pre>{listingsError.message}</pre>
      </div>
    )
  }

  const pendingApps = (brokerApps ?? []) as BrokerApp[]
  const pendingCount =
    (allListings ?? []).filter(l => l.status === 'pending').length +
    (homeListings ?? []).filter(l => l.status === 'pending').length

  return (
    <div>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Admin</h1>
          <p style={{ color: '#6b7280', margin: 0 }}>
            {pendingCount} pending review · {(allListings ?? []).length} hangars · {(homeListings ?? []).length} homes/land · {(hangarRequests ?? []).length} requests · {adminUsers.length} users · {pendingApps.length} broker application{pendingApps.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <ReGeocodeButton />
          <Link href="/broker/dashboard" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.45rem 0.9rem', borderRadius: '7px',
            backgroundColor: '#dbeafe', color: '#1e40af',
            border: '1px solid #bfdbfe', fontWeight: '600',
            fontSize: '0.825rem', textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            <Building2 size={14} style={{ flexShrink: 0 }} /> Broker Dashboard
          </Link>
          <Link href="/admin/featured" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.45rem 0.9rem', borderRadius: '7px',
            backgroundColor: '#eef2ff', color: '#4338ca',
            border: '1px solid #c7d2fe', fontWeight: '600',
            fontSize: '0.825rem', textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            <Star size={14} style={{ flexShrink: 0 }} /> Manage Featured
          </Link>
        </div>
      </div>

      {/* ── Broker Applications ───────────────────────────────────────────── */}
      {pendingApps.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1rem', color: '#374151', margin: '0 0 0.75rem' }}>
            <Building2 size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.35rem' }} /> Broker Applications
          </h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {pendingApps.map((app: BrokerApp) => (
              <div key={app.id} style={{
                border: '2px solid #bfdbfe', borderRadius: '8px',
                padding: '1.25rem', backgroundColor: '#eff6ff',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>{app.full_name}</h3>
                    <p style={{ margin: '0 0 0.2rem', fontSize: '0.875rem', color: '#374151' }}>
                      <strong>{app.brokerage}</strong>
                    </p>
                    {app.is_unlicensed ? (
                      <p style={{ margin: '0 0 0.2rem', fontSize: '0.875rem' }}>
                        <span style={{ display: 'inline-block', backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', padding: '0.1rem 0.5rem', marginRight: '0.4rem' }}>
                          ⚠ No RE License
                        </span>
                        Hangar / personal property specialist
                      </p>
                    ) : (
                      <p style={{ margin: '0 0 0.2rem', fontSize: '0.875rem', color: '#374151' }}>
                        License: {app.license_state} #{app.license_number}
                      </p>
                    )}
                    <p style={{ margin: '0 0 0.2rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      {app.email}{app.phone ? ` · ${app.phone}` : ''}
                    </p>
                    {app.website && (
                      <a href={app.website} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '0.875rem', color: '#2563eb' }}>
                        {app.website} ↗
                      </a>
                    )}
                    {app.bio && (
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#374151', lineHeight: 1.6 }}>
                        {app.bio}
                      </p>
                    )}
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
                      Applied {new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <BrokerApplicationButtons applicationId={app.id} userId={app.user_id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Hangar Listings ───────────────────────────────────────────────── */}
      <div style={{ borderRadius: '12px', border: '1px solid #bfdbfe', overflow: 'hidden', marginBottom: '2rem' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          padding: '0.85rem 1.25rem',
          backgroundColor: '#eff6ff', borderBottom: '1px solid #bfdbfe',
        }}>
          <span style={{ fontSize: '1.15rem' }}>🛩</span>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e40af' }}>Hangar Listings</span>
          <span style={{
            marginLeft: '0.35rem', fontSize: '0.75rem', fontWeight: 600,
            backgroundColor: '#dbeafe', color: '#1e40af',
            border: '1px solid #bfdbfe', borderRadius: '20px',
            padding: '0.1rem 0.55rem',
          }}>
            {(allListings ?? []).length}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#3b82f6' }}>
            {(allListings ?? []).filter(l => l.status === 'pending').length} pending
          </span>
        </div>
        <div style={{ padding: '1rem', backgroundColor: 'white' }}>
          <AdminListingsManager
            initialListings={allListings ?? []}
            brokers={(brokerProfiles ?? [])
              .filter(bp => (bp as { is_verified?: boolean }).is_verified)
              .map(bp => ({ id: bp.id, user_id: bp.user_id ?? '', full_name: bp.full_name, brokerage: (bp as { brokerage?: string }).brokerage ?? null }))
            }
          />
        </div>
      </div>

      {/* ── Airport Homes / Land ──────────────────────────────────────────── */}
      <div style={{ borderRadius: '12px', border: '1px solid #a7f3d0', overflow: 'hidden', marginBottom: '2rem' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          padding: '0.85rem 1.25rem',
          backgroundColor: '#ecfdf5', borderBottom: '1px solid #a7f3d0',
        }}>
          <Home size={16} style={{ color: '#065f46', flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#065f46' }}>Airport Homes &amp; Land</span>
          <span style={{
            marginLeft: '0.35rem', fontSize: '0.75rem', fontWeight: 600,
            backgroundColor: '#d1fae5', color: '#065f46',
            border: '1px solid #a7f3d0', borderRadius: '20px',
            padding: '0.1rem 0.55rem',
          }}>
            {(homeListings ?? []).length}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#059669' }}>
            {(homeListings ?? []).filter(l => l.status === 'pending').length} pending
          </span>
        </div>
        <div style={{ padding: '1rem', backgroundColor: 'white' }}>
          <AdminHomesManager initialListings={(homeListings ?? []) as AdminHomeListing[]} />
        </div>
      </div>

      {/* ── Hangar Requests ──────────────────────────────────────────────── */}
      <div style={{ borderRadius: '12px', border: '1px solid #e9d5ff', overflow: 'hidden', marginBottom: '2rem' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          padding: '0.85rem 1.25rem',
          backgroundColor: '#faf5ff', borderBottom: '1px solid #e9d5ff',
        }}>
          <MessageSquare size={16} style={{ color: '#7c3aed', flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#7c3aed' }}>Hangar Requests</span>
          <span style={{
            marginLeft: '0.35rem', fontSize: '0.75rem', fontWeight: 600,
            backgroundColor: '#ede9fe', color: '#7c3aed',
            border: '1px solid #ddd6fe', borderRadius: '20px',
            padding: '0.1rem 0.55rem',
          }}>
            {(hangarRequests ?? []).length}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#7c3aed' }}>
            {(hangarRequests ?? []).filter(r => r.status === 'active').length} active ·{' '}
            {(hangarRequests ?? []).filter(r => r.status === 'pending_payment').length} pending payment
          </span>
        </div>
        <div style={{ padding: '1rem', backgroundColor: 'white' }}>
          <AdminRequestsManager initialRequests={(hangarRequests ?? []) as AdminRequest[]} />
        </div>
      </div>

      {/* ── Broker Profiles ───────────────────────────────────────────────── */}
      <h2 style={{ fontSize: '1rem', color: '#374151', margin: '2.5rem 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Building2 size={15} style={{ display: 'inline', verticalAlign: 'middle' }} /> Broker Profiles
      </h2>
      <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem' }}>
        <AdminBrokersManager brokers={adminBrokers} />
      </div>

      {/* ── Users ─────────────────────────────────────────────────────────── */}
      <h2 style={{ fontSize: '1rem', color: '#374151', margin: '2.5rem 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Users size={15} style={{ display: 'inline', verticalAlign: 'middle' }} /> All Users
      </h2>
      <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem' }}>
        <AdminUsersManager users={adminUsers} />
      </div>
    </div>
  )
}
