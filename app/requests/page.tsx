/**
 * Hangar Requests — browse page
 *
 * GA pilots and operators post what they're looking for.
 * Hangar owners browse and click "I Have Space" to contact them directly.
 */

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createServerClient } from '@/lib/supabase-server'
import ReplyButton from './ReplyButton'
import type { Metadata } from 'next'
import { Zap, Plane, ArrowLeftRight, DoorOpen, DollarSign, Calendar } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Hangar Requests | Hangar Marketplace',
  description: 'Browse requests from pilots looking for hangar space at airports across the US.',
}

type Request = {
  id: string
  contact_name: string
  airport_code: string
  airport_name: string
  city: string
  state: string
  aircraft_type: string | null
  wingspan_ft: number | null
  door_width_ft: number | null
  door_height_ft: number | null
  monthly_budget: number | null
  duration: string | null
  move_in_date: string | null
  notes: string | null
  is_priority: boolean
  created_at: string
}

type SearchParams = Promise<{ airport?: string; state?: string }>

export default async function RequestsPage({ searchParams }: { searchParams: SearchParams }) {
  const { airport, state } = await searchParams

  const serverSupabase = await createServerClient()
  const { data: { user } } = await serverSupabase.auth.getUser()

  let query = supabaseAdmin
    .from('hangar_requests')
    .select('*')
    .in('status', ['open', 'active'])
    .order('is_priority', { ascending: false })
    .order('created_at', { ascending: false })

  if (airport?.trim()) {
    query = query.ilike('airport_code', `%${airport.trim()}%`)
  }
  if (state?.trim()) {
    query = query.ilike('state', `%${state.trim()}%`)
  }

  const { data: requests } = await query
  const safeRequests = (requests ?? []) as Request[]

  return (
    <div style={{ maxWidth: '860px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.3rem' }}>Hangar Requests</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.925rem', lineHeight: 1.5 }}>
            Pilots looking for hangar space. If you have room, reach out.
          </p>
        </div>
        <Link href="/requests/new" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.6rem 1.25rem', backgroundColor: '#111827', color: 'white',
          borderRadius: '7px', textDecoration: 'none', fontWeight: '600', fontSize: '0.875rem',
          flexShrink: 0,
        }}>
          + Post a Request
        </Link>
      </div>

      {/* Filters */}
      <form method="GET" style={{
        display: 'flex', gap: '0.5rem', flexWrap: 'wrap',
        marginBottom: '1.5rem', alignItems: 'flex-end',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={labelStyle}>Airport code</label>
          <input name="airport" defaultValue={airport ?? ''} placeholder="KPAE" style={filterInput} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={labelStyle}>State</label>
          <input name="state" defaultValue={state ?? ''} placeholder="WA" style={filterInput} />
        </div>
        <button type="submit" style={filterBtn('#111827', 'white')}>Search</button>
        {(airport || state) && (
          <a href="/requests" style={filterBtn('white', '#374151', '#d1d5db')}>Clear</a>
        )}
      </form>

      {/* Results count */}
      <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#6b7280' }}>
        {safeRequests.length} active request{safeRequests.length !== 1 ? 's' : ''}
      </p>

      {/* Empty state */}
      {safeRequests.length === 0 && (
        <div style={{
          backgroundColor: 'white', border: '1px dashed #d1d5db', borderRadius: '12px',
          padding: '4rem 2rem', textAlign: 'center',
        }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <p style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: '700', color: '#111827' }}>No requests yet</p>
          <p style={{ margin: '0 0 1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
            {airport || state ? 'Try a different filter.' : 'Be the first to post what you\'re looking for.'}
          </p>
          <Link href="/requests/new" style={{
            padding: '0.6rem 1.25rem', backgroundColor: '#111827', color: 'white',
            borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '0.875rem',
          }}>
            Post a Request
          </Link>
        </div>
      )}

      {/* Request cards */}
      {safeRequests.length > 0 && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {safeRequests.map((req: Request) => (
            <RequestCard key={req.id} req={req} userId={user?.id ?? null} />
          ))}
        </div>
      )}
    </div>
  )
}

function RequestCard({ req, userId }: { req: Request; userId: string | null }) {
  const daysAgo = Math.floor(
    (Date.now() - new Date(req.created_at).getTime()) / (1000 * 60 * 60 * 24)
  )
  const timeLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`

  return (
    <div style={{
      backgroundColor: req.is_priority ? '#fffbeb' : 'white',
      border: `1px solid ${req.is_priority ? '#fde68a' : '#e5e7eb'}`,
      borderRadius: '10px',
      padding: '1.25rem', display: 'grid', gap: '0.85rem',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {req.is_priority && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                padding: '0.15rem 0.5rem', borderRadius: '999px',
                backgroundColor: '#f59e0b', color: 'white',
                fontSize: '0.68rem', fontWeight: '800',
              }}>
                <Zap size={10} style={{ flexShrink: 0 }} /> Priority
              </span>
            )}
            <span style={{
              fontSize: '1.05rem', fontWeight: '700', color: '#111827',
            }}>
              {req.airport_code}
            </span>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {req.airport_name}{req.city ? `, ${req.city}, ${req.state}` : ''}
            </span>
          </div>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#9ca3af' }}>
            Posted by {req.contact_name} · {timeLabel}
          </p>
        </div>
        <ReplyButton requestId={req.id} contactName={req.contact_name} userId={userId} />
      </div>

      {/* Specs grid */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {req.aircraft_type && <Chip icon={<Plane size={12} />} label={req.aircraft_type} />}
        {req.wingspan_ft && <Chip icon={<ArrowLeftRight size={12} />} label={`${req.wingspan_ft}′ wingspan`} />}
        {(req.door_width_ft || req.door_height_ft) && (
          <Chip icon={<DoorOpen size={12} />} label={`Door ≥ ${req.door_width_ft ?? '?'}′ W × ${req.door_height_ft ?? '?'}′ H`} />
        )}
        {req.monthly_budget && <Chip icon={<DollarSign size={12} />} label={`$${req.monthly_budget.toLocaleString()}/mo budget`} color="#166534" bg="#f0fdf4" border="#bbf7d0" />}
        {req.duration && <Chip icon={<Calendar size={12} />} label={req.duration} />}
        {req.move_in_date && (
          <Chip icon={<Calendar size={12} />} label={`Move-in ${new Date(req.move_in_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`} />
        )}
      </div>

      {/* Notes */}
      {req.notes && (
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151', lineHeight: 1.6 }}>
          {req.notes}
        </p>
      )}
    </div>
  )
}

function Chip({ icon, label, color = '#374151', bg = '#f3f4f6', border = '#e5e7eb' }: {
  icon: React.ReactNode; label: string; color?: string; bg?: string; border?: string
}) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.78rem',
      backgroundColor: bg, border: `1px solid ${border}`, color, fontWeight: '500',
    }}>
      {icon} {label}
    </span>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.7rem', fontWeight: '700', color: '#6b7280',
  textTransform: 'uppercase', letterSpacing: '0.05em',
}

const filterInput: React.CSSProperties = {
  padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px',
  fontSize: '0.875rem', backgroundColor: 'white', width: '110px', boxSizing: 'border-box',
}

function filterBtn(bg: string, color: string, border?: string): React.CSSProperties {
  return {
    padding: '0.5rem 1rem', backgroundColor: bg, color,
    border: `1px solid ${border ?? bg}`, borderRadius: '6px',
    fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
    textDecoration: 'none', display: 'inline-block', alignSelf: 'flex-end',
  }
}
