'use client'

import { useState, useMemo } from 'react'

export type AdminListing = {
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
  status: string
  is_sample: boolean
  is_featured: boolean
  is_sponsored: boolean
  contact_name: string
  contact_email: string
  contact_phone: string | null
  created_at: string
  view_count: number | null
}

type ActionState = Record<string, 'idle' | 'loading' | 'done' | 'error'>

const TYPE_LABELS: Record<string, string> = {
  sale: 'For Sale',
  lease: 'For Lease',
  space: 'Space Available',
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  approved: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  pending:  { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' },
  rejected: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
}

export default function AdminListingsManager({ initialListings }: { initialListings: AdminListing[] }) {
  const [listings, setListings] = useState<AdminListing[]>(initialListings)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterState, setFilterState] = useState('all')
  const [actions, setActions] = useState<ActionState>({})
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Unique states for the filter dropdown
  const states = useMemo(() => {
    const s = new Set(listings.map(l => l.state).filter(Boolean))
    return Array.from(s).sort()
  }, [listings])

  const filtered = useMemo(() => {
    return listings.filter(l => {
      if (filterType !== 'all' && l.listing_type !== filterType) return false
      if (filterStatus !== 'all' && l.status !== filterStatus) return false
      if (filterState !== 'all' && l.state !== filterState) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (
          !l.title.toLowerCase().includes(q) &&
          !l.airport_code.toLowerCase().includes(q) &&
          !l.airport_name.toLowerCase().includes(q) &&
          !l.city.toLowerCase().includes(q) &&
          !l.contact_email.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [listings, filterType, filterStatus, filterState, search])

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
          placeholder="Search title, airport, city, email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, minWidth: '220px', flex: '1' }}
        />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={inputStyle}>
          <option value="all">All types</option>
          <option value="sale">For Sale</option>
          <option value="lease">For Lease</option>
          <option value="space">Space Available</option>
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
          {filtered.length} of {listings.length} listing{listings.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Listing rows ───────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div style={{
          padding: '3rem', textAlign: 'center', color: '#6b7280',
          border: '1px dashed #d1d5db', borderRadius: '10px', backgroundColor: 'white',
        }}>
          No listings match the current filters.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          {filtered.map(listing => {
            const sc = STATUS_COLORS[listing.status] ?? STATUS_COLORS.pending
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
                {/* Top row: title + status badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem' }}>{listing.title}</span>
                    {listing.is_sample && <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '4px', padding: '0.1rem 0.4rem' }}>🔍 SAMPLE</span>}
                    {listing.is_featured && <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe', borderRadius: '4px', padding: '0.1rem 0.4rem' }}>⭐ FEATURED</span>}
                    {listing.is_sponsored && <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#ede9fe', color: '#5b21b6', border: '1px solid #ddd6fe', borderRadius: '4px', padding: '0.1rem 0.4rem' }}>💎 SPONSORED</span>}
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '20px', backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, whiteSpace: 'nowrap' }}>
                    {listing.status}
                  </span>
                </div>

                {/* Meta row */}
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <span>✈️ {listing.airport_code} · {listing.city}, {listing.state}</span>
                  <span>📋 {TYPE_LABELS[listing.listing_type] ?? listing.listing_type}</span>
                  {listing.ownership_type && <span>🏛 {listing.ownership_type}</span>}
                  {listing.square_feet && <span>📐 {listing.square_feet.toLocaleString()} sq ft</span>}
                  <span>
                    💰 {listing.asking_price
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

                  {/* Sample toggle (approved only) */}
                  {listing.status === 'approved' && (
                    <button
                      disabled={isSampleLoading}
                      onClick={() => handleToggleSample(listing.id, listing.is_sample)}
                      style={btnStyle(
                        listing.is_sample ? '#374151' : '#374151',
                        listing.is_sample ? '#f3f4f6' : 'white',
                        listing.is_sample ? '#d1d5db' : '#d1d5db',
                      )}
                    >
                      {isSampleLoading ? '…' : listing.is_sample ? '🔍 Unmark Sample' : 'Mark as Sample'}
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
    </div>
  )
}
