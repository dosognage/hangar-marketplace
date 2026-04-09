/**
 * Admin Review Page
 *
 * The middleware already ensures only users in ADMIN_EMAILS can reach
 * this page. We double-check here server-side for defence in depth.
 */

export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import BrokerApplicationButtons from './BrokerApplicationButtons'
import ReGeocodeButton from './RegeoCodeButton'
import AdminListingsManager from './AdminListingsManager'
import { Star, Building2 } from 'lucide-react'

type BrokerApp = {
  id: string
  user_id: string
  email: string
  full_name: string
  brokerage: string
  license_state: string
  license_number: string
  phone: string | null
  website: string | null
  bio: string | null
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

  // Fetch ALL listings (admin sees everything, filterable client-side)
  const { data: allListings, error: listingsError } = await supabaseAdmin
    .from('listings')
    .select('id, title, airport_name, airport_code, city, state, listing_type, ownership_type, asking_price, monthly_lease, square_feet, status, is_sample, is_featured, is_sponsored, contact_name, contact_email, contact_phone, created_at, view_count')
    .order('created_at', { ascending: false })

  // Fetch pending broker applications
  const { data: brokerApps } = await supabaseAdmin
    .from('broker_applications')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

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
  const pendingCount = (allListings ?? []).filter(l => l.status === 'pending').length

  return (
    <div>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Admin</h1>
          <p style={{ color: '#6b7280', margin: 0 }}>
            {pendingCount} pending review · {(allListings ?? []).length} total listings · {pendingApps.length} broker application{pendingApps.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <ReGeocodeButton />
          <a href="/admin/featured" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.45rem 0.9rem', borderRadius: '7px',
            backgroundColor: '#fef3c7', color: '#92400e',
            border: '1px solid #fde68a', fontWeight: '600',
            fontSize: '0.825rem', textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            <Star size={14} style={{ flexShrink: 0 }} /> Manage Featured
          </a>
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
                    <p style={{ margin: '0 0 0.2rem', fontSize: '0.875rem', color: '#374151' }}>
                      License: {app.license_state} #{app.license_number}
                    </p>
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

      {/* ── All Listings Manager ──────────────────────────────────────────── */}
      <h2 style={{ fontSize: '1rem', color: '#374151', margin: '0 0 0.75rem' }}>
        All Listings
      </h2>
      <AdminListingsManager initialListings={allListings ?? []} />
    </div>
  )
}
