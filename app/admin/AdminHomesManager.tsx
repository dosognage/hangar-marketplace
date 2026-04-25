'use client'

import { useState, useMemo } from 'react'
import AssignBrokerPopover, { type BrokerOption } from './AssignBrokerPopover'

export type AdminHomeListing = {
  id: string
  title: string
  airport_name: string
  airport_code: string
  city: string
  state: string
  property_type: string
  listing_type: string
  asking_price: number | null
  monthly_lease: number | null
  bedrooms: number | null
  bathrooms: number | null
  home_sqft: number | null
  lot_acres: number | null
  has_runway_access: boolean | null
  airpark_name: string | null
  status: string
  is_sample: boolean
  contact_name: string
  contact_email: string
  contact_phone: string | null
  created_at: string
  view_count: number | null
  broker_profile_id: string | null
}

type ActionState = Record<string, 'idle' | 'loading' | 'done' | 'error'>

const TYPE_LABELS: Record<string, string> = {
  sale:  'For Sale',
  lease: 'For Lease',
  space: 'Space Available',
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  airport_home:     'Airport Home',
  land:             'Land / Lot',
  fly_in_community: 'Fly-in Community',
}

const PROPERTY_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  airport_home:     { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
  land:             { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  fly_in_community: { bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff' },
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  approved: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  pending:  { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' },
  rejected: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
}

export default function AdminHomesManager({
  initialListings,
  brokers = [],
}: {
  initialListings: AdminHomeListing[]
  brokers?: BrokerOption[]
}) {
  const [listings, setListings] = useState<AdminHomeListing[]>(initialListings)
  const [search, setSearch] = useState('')
  const [filterPropType, setFilterPropType] = useState('all')
  const [filterListType, setFilterListType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterState, setFilterState] = useState('all')
  const [actions, setActions] = useState<ActionState>({})
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  // Track which listing is currently being assigned to a broker (modal open).
  const [assigningId, setAssigningId] = useState<string | null>(null)

  const states = useMemo(() => {
    const s = new Set(listings.map(l => l.state).filter(Boolean))
    return Array.from(s).sort()
  }, [listings])

  const filtered = useMemo(() => {
    return listings.filter(l => {
      if (filterPropType !== 'all' && l.property_type !== filterPropType) return false
      if (filterListType !== 'all' && l.listing_type !== filterListType) return false
      if (filterStatus !== 'all' && l.status !== filterStatus) return false
      if (filterState !== 'all' && l.state !== filterState) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (
          !l.title.toLowerCase().includes(q) &&
          !l.airport_code.toLowerCase().includes(q) &&
          !l.airport_name.toLowerCase().includes(q) &&
          !l.city.toLowerCase().includes(q) &&
          !l.contact_email.toLowerCase().includes(q) &&
          !(l.airpark_name ?? '').toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [listings, filterPropType, filterListType, filterStatus, filterState, search])

  function setAction(id: string, state: ActionState[string]) {
    setActions(prev => ({ ...prev, [id]: state }))
  }

  async function handleStatusChange(id: string, newStatus: string) {
    setAction(id, 'loading')
    try {
      const res = await fetch('/api/admin/listings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      if (res.ok) {
        setListings(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l))
        setAction(id, 'done')
      } else {
        setAction(id, 'error')
      }
    } catch {
      setAction(id, 'error')
    }
    setTimeout(() => setAction(id, 'idle'), 2000)
  }

  async function handleToggleSample(id: string, current: boolean) {
    setAction(id + '_sample', 'loading')
    try {
      const res = await fetch('/api/admin/mark-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: id, isSample: !current }),
      })
      if (res.ok) {
        setListings(prev => prev.map(l => l.id === id ? { ...l, is_sample: !current } : l))
      }
    } finally {
      setAction(id + '_sample', 'idle')
    }
  }

  async function handleDelete(id: string) {
    setAction(id + '_del', 'loading')
    setConfirmDelete(null)
    try {
      const res = await fetch('/api/admin/listings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setListings(prev => prev.filter(l => l.id !== id))
      } else {
        setAction(id + '_del', 'error')
        setTimeout(() => setAction(id + '_del', 'idle'), 3000)
      }
    } catch {
      setAction(id + '_del', 'error')
      setTimeout(() => setAction(id + '_del', 'idle'), 3000)
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '0.4rem 0.65rem',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '0.825rem',
    backgroundColor: 'white',
    color: '#111827',
    outline: 'none',
  }

  const btnStyle = (color: string, bg: string, border: string): React.CSSProperties => ({
    padding: '0.3rem 0.75rem',
    fontSize: '0.775rem',
    fontWeight: 400,
    borderRadius: '6px',
    border: `1px solid ${border}`,
    backgroundColor: bg,
    color,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    letterSpacing: '0.01em',
  })

  return (
    <div>
      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center',
        marginBottom: '1rem', padding: '0.75rem 1rem',
        backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb',
      }}>
        <input
          type="text"
          placeholder="Search title, airport, city, email, airpark…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, minWidth: '220px', flex: '1' }}
        />
        <select value={filterPropType} onChange={e => setFilterPropType(e.target.value)} style={inputStyle}>
          <option value="all">All property types</option>
          <option value="airport_home">Airport Homes</option>
          <option value="land">Land / Lots</option>
          <option value="fly_in_community">Fly-in Communities</option>
        </select>
        <select value={filterListType} onChange={e => setFilterListType(e.target.value)} style={inputStyle}>
          <option value="all">All listing types</option>
          <option value="sale">For Sale</option>
          <option value="lease">For Lease</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={inputStyle}>
          <option value="all">All statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
        {states.length > 1 && (
          <select value={filterState} onChange={e => setFilterState(e.target.value)} style={inputStyle}>
            <option value="all">All states</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <span style={{ fontSize: '0.8rem', color: '#6b7280', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          {filtered.length} of {listings.length} propert{listings.length !== 1 ? 'ies' : 'y'}
        </span>
      </div>

      {/* ── Listing rows ───────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div style={{
          padding: '3rem', textAlign: 'center', color: '#6b7280',
          border: '1px dashed #d1d5db', borderRadius: '10px', backgroundColor: 'white',
        }}>
          No properties match the current filters.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          {filtered.map(listing => {
            const sc = STATUS_COLORS[listing.status] ?? STATUS_COLORS.pending
            const pc = PROPERTY_TYPE_COLORS[listing.property_type] ?? PROPERTY_TYPE_COLORS.airport_home
            const ptLabel = PROPERTY_TYPE_LABELS[listing.property_type] ?? listing.property_type
            const isDeleting = actions[listing.id + '_del'] === 'loading'
            const isSampleLoading = actions[listing.id + '_sample'] === 'loading'
            const isStatusLoading = actions[listing.id] === 'loading'
            const statusDone = actions[listing.id] === 'done'
            const statusError = actions[listing.id] === 'error'

            return (
              <div key={listing.id} style={{
                border: `1px solid ${listing.is_sample ? '#d1d5db' : '#e5e7eb'}`,
                borderLeft: `4px solid ${sc.border}`,
                borderRadius: '8px',
                padding: '0.9rem 1.1rem',
                backgroundColor: listing.is_sample ? '#f9fafb' : 'white',
                opacity: isDeleting ? 0.4 : 1,
                transition: 'opacity 0.2s',
              }}>
                {/* Top row: title + badges + status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem' }}>{listing.title}</span>
                    {/* Property type badge */}
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700,
                      backgroundColor: pc.bg, color: pc.text,
                      border: `1px solid ${pc.border}`,
                      borderRadius: '4px', padding: '0.1rem 0.4rem',
                    }}>
                      {ptLabel}
                    </span>
                    {listing.is_sample && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '4px', padding: '0.1rem 0.4rem' }}>
                        🔍 SAMPLE
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '20px', backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, whiteSpace: 'nowrap' }}>
                    {listing.status}
                  </span>
                </div>

                {/* Meta row */}
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <span>✈️ {listing.airport_code} · {listing.city}, {listing.state}</span>
                  <span>📋 {TYPE_LABELS[listing.listing_type] ?? listing.listing_type}</span>
                  {listing.airpark_name && <span>🏘 {listing.airpark_name}</span>}
                  {listing.has_runway_access && <span style={{ color: '#059669', fontWeight: 600 }}>✈ Runway access</span>}
                  {listing.bedrooms != null && <span>🛏 {listing.bedrooms} bed</span>}
                  {listing.bathrooms != null && <span>🚿 {listing.bathrooms} bath</span>}
                  {listing.home_sqft != null && <span>📐 {listing.home_sqft.toLocaleString()} sq ft</span>}
                  {listing.lot_acres != null && <span>🌿 {listing.lot_acres} acres</span>}
                  <span>
                    💰{' '}{listing.asking_price
                      ? `$${listing.asking_price.toLocaleString()}`
                      : listing.monthly_lease
                        ? `$${listing.monthly_lease.toLocaleString()}/mo`
                        : 'Contact for price'}
                  </span>
                  {listing.view_count != null && <span>👁 {listing.view_count} views</span>}
                  <span>📅 {new Date(listing.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>

                {/* Contact row */}
                <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: '0.75rem' }}>
                  {listing.contact_name} · {listing.contact_email}{listing.contact_phone ? ` · ${listing.contact_phone}` : ''}
                </div>

                {/* Action row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                  {/* View */}
                  <a
                    href={`/listing/${listing.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={btnStyle('#374151', '#f3f4f6', '#d1d5db')}
                  >
                    View ↗
                  </a>

                  {/* Status changes */}
                  {listing.status !== 'approved' && (
                    <button
                      disabled={isStatusLoading}
                      onClick={() => handleStatusChange(listing.id, 'approved')}
                      style={btnStyle('#15803d', '#f0fdf4', '#bbf7d0')}
                    >
                      {isStatusLoading ? '…' : '✓ Approve'}
                    </button>
                  )}
                  {listing.status !== 'rejected' && (
                    <button
                      disabled={isStatusLoading}
                      onClick={() => handleStatusChange(listing.id, 'rejected')}
                      style={btnStyle('#b91c1c', '#fef2f2', '#fecaca')}
                    >
                      {isStatusLoading ? '…' : '✗ Reject'}
                    </button>
                  )}
                  {listing.status !== 'pending' && (
                    <button
                      disabled={isStatusLoading}
                      onClick={() => handleStatusChange(listing.id, 'pending')}
                      style={btnStyle('#1d4ed8', '#eff6ff', '#93c5fd')}
                    >
                      {isStatusLoading ? '…' : '↩ Set Pending'}
                    </button>
                  )}

                  {/* Sample toggle */}
                  {listing.status === 'approved' && (
                    <button
                      disabled={isSampleLoading}
                      onClick={() => handleToggleSample(listing.id, listing.is_sample)}
                      style={btnStyle('#374151', listing.is_sample ? '#f3f4f6' : 'white', '#d1d5db')}
                    >
                      {isSampleLoading ? '…' : listing.is_sample ? '🔍 Unmark Sample' : 'Mark as Sample'}
                    </button>
                  )}

                  {/* Assign / reassign broker — works for any property type. */}
                  {brokers.length > 0 && (
                    <button
                      onClick={() => setAssigningId(listing.id)}
                      style={btnStyle(
                        listing.broker_profile_id ? '#1d4ed8' : '#374151',
                        listing.broker_profile_id ? '#eff6ff' : 'white',
                        listing.broker_profile_id ? '#bfdbfe' : '#d1d5db',
                      )}
                    >
                      🏢 {listing.broker_profile_id ? 'Reassign Broker' : 'Assign Broker'}
                    </button>
                  )}

                  {/* Status feedback */}
                  {statusDone && <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>✓ Saved</span>}
                  {statusError && <span style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 600 }}>Error. Try again.</span>}

                  {/* Delete */}
                  <div style={{ marginLeft: 'auto' }}>
                    {confirmDelete === listing.id ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 400 }}>Delete permanently?</span>
                        <button
                          onClick={() => handleDelete(listing.id)}
                          style={btnStyle('white', '#dc2626', '#dc2626')}
                        >
                          Yes, delete
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          style={btnStyle('#374151', '#f3f4f6', '#d1d5db')}
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        disabled={isDeleting}
                        onClick={() => setConfirmDelete(listing.id)}
                        style={btnStyle('#b91c1c', 'white', '#fecaca')}
                      >
                        {isDeleting ? 'Deleting…' : '🗑 Delete'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Broker assignment modal — rendered at root so it overlays everything. */}
      {assigningId && (
        <AssignBrokerPopover
          listingId={assigningId}
          currentBrokerProfileId={
            listings.find(l => l.id === assigningId)?.broker_profile_id ?? null
          }
          brokers={brokers}
          onClose={() => setAssigningId(null)}
          onAssigned={(listingId, brokerId) => {
            setListings(prev => prev.map(l =>
              l.id === listingId ? { ...l, broker_profile_id: brokerId } : l
            ))
          }}
        />
      )}
    </div>
  )
}
