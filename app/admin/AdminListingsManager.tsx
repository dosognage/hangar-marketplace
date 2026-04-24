'use client'

import { useState, useMemo } from 'react'
import FeetInchesInput from '@/app/components/FeetInchesInput'

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
  sponsored_until: string | null
  contact_name: string
  contact_email: string
  contact_phone: string | null
  created_at: string
  view_count: number | null
  broker_profile_id: string | null
}

type BrokerOption = {
  id: string
  user_id: string
  full_name: string
  brokerage: string | null
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

const inputStyle: React.CSSProperties = {
  padding: '0.4rem 0.65rem',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  fontSize: '0.825rem',
  backgroundColor: 'white',
  color: '#111827',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
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

// ── Create Listing Modal ─────────────────────────────────────────────────────

const OWNERSHIP_TYPES = ['Private', 'Municipal', 'Condo / Fractional', 'Airport Authority', 'Other']

type CreateForm = {
  title: string
  listing_type: string
  ownership_type: string
  airport_code: string
  airport_name: string
  city: string
  state: string
  asking_price: string
  monthly_lease: string
  square_feet: string
  door_width: string
  door_height: string
  hangar_depth: string
  contact_name: string
  contact_email: string
  contact_phone: string
  description: string
  broker_profile_id: string
}

const EMPTY_FORM: CreateForm = {
  title: '', listing_type: 'lease', ownership_type: '', airport_code: '', airport_name: '',
  city: '', state: '', asking_price: '', monthly_lease: '', square_feet: '',
  door_width: '', door_height: '', hangar_depth: '', contact_name: '', contact_email: '',
  contact_phone: '', description: '', broker_profile_id: '',
}

function CreateListingModal({
  brokers,
  onClose,
  onCreated,
}: {
  brokers: BrokerOption[]
  onClose: () => void
  onCreated: (listing: AdminListing) => void
}) {
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof CreateForm, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const selectedBroker = brokers.find(b => b.id === form.broker_profile_id)
      const res = await fetch('/api/admin/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          broker_user_id:    selectedBroker?.user_id ?? null,
          asking_price:      form.asking_price      || null,
          monthly_lease:     form.monthly_lease     || null,
          square_feet:       form.square_feet       || null,
          door_width:        form.door_width        || null,
          door_height:       form.door_height       || null,
          hangar_depth:      form.hangar_depth      || null,
          ownership_type:    form.ownership_type    || null,
          contact_phone:     form.contact_phone     || null,
          description:       form.description       || null,
          broker_profile_id: form.broker_profile_id || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed to create listing'); return }

      // Build a partial listing object so the UI updates immediately
      const now = new Date().toISOString()
      const broker = brokers.find(b => b.id === form.broker_profile_id)
      onCreated({
        id: json.id,
        title: form.title,
        airport_code: form.airport_code.toUpperCase(),
        airport_name: form.airport_name || form.airport_code.toUpperCase(),
        city: form.city,
        state: form.state,
        listing_type: form.listing_type,
        ownership_type: '',
        asking_price: form.asking_price ? Number(form.asking_price) : null,
        monthly_lease: form.monthly_lease ? Number(form.monthly_lease) : null,
        square_feet: form.square_feet ? Number(form.square_feet) : null,
        status: 'approved',
        is_sample: false,
        is_featured: false,
        is_sponsored: false,
        sponsored_until: null,
        contact_name: form.contact_name,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone || null,
        created_at: now,
        view_count: 0,
        broker_profile_id: broker?.id ?? null,
      })
      onClose()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const label = (text: string): React.CSSProperties => ({
    fontSize: '0.75rem', fontWeight: 600, color: '#374151',
    display: 'block', marginBottom: '0.25rem',
  })
  const field = (span?: number): React.CSSProperties => ({
    gridColumn: span ? `span ${span}` : undefined,
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 1000, padding: '2rem 1rem', overflowY: 'auto',
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '640px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ backgroundColor: '#1a3a5c', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>✈ Create Listing as Admin</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', fontSize: '1.1rem', padding: '0.1rem 0.3rem' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>

            {/* Title */}
            <div style={field(2)}>
              <label style={label('Title *')}>
                <input required value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. T-Hangar at KBFI" style={inputStyle} />
              </label>
            </div>

            {/* Listing type */}
            <div>
              <label style={label('Listing Type *')}>
                <select required value={form.listing_type} onChange={e => set('listing_type', e.target.value)} style={inputStyle}>
                  <option value="lease">For Lease</option>
                  <option value="sale">For Sale</option>
                  <option value="space">Space Available</option>
                </select>
              </label>
            </div>

            {/* Ownership type */}
            <div>
              <label style={label('Ownership Type *')}>
                <select required value={form.ownership_type} onChange={e => set('ownership_type', e.target.value)} style={inputStyle}>
                  <option value="">— Select —</option>
                  {OWNERSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
            </div>

            {/* Airport code */}
            <div>
              <label style={label('Airport Code (ICAO/FAA) *')}>
                <input required value={form.airport_code} onChange={e => set('airport_code', e.target.value.toUpperCase())} placeholder="KBFI" style={inputStyle} maxLength={6} />
              </label>
            </div>

            {/* Airport name */}
            <div style={field(2)}>
              <label style={label('Airport Name')}>
                <input value={form.airport_name} onChange={e => set('airport_name', e.target.value)} placeholder="Boeing Field / King County International" style={inputStyle} />
              </label>
            </div>

            {/* City */}
            <div>
              <label style={label('City *')}>
                <input required value={form.city} onChange={e => set('city', e.target.value)} placeholder="Seattle" style={inputStyle} />
              </label>
            </div>

            {/* State */}
            <div>
              <label style={label('State *')}>
                <input required value={form.state} onChange={e => set('state', e.target.value)} placeholder="WA" style={inputStyle} maxLength={2} />
              </label>
            </div>

            {/* Price */}
            <div>
              <label style={label(form.listing_type === 'sale' ? 'Asking Price ($)' : 'Monthly Lease ($)')}>
                {form.listing_type === 'sale'
                  ? <input type="number" value={form.asking_price} onChange={e => set('asking_price', e.target.value)} placeholder="250000" style={inputStyle} />
                  : <input type="number" value={form.monthly_lease} onChange={e => set('monthly_lease', e.target.value)} placeholder="500" style={inputStyle} />
                }
              </label>
            </div>

            {/* Sq ft */}
            <div>
              <label style={label('Square Feet')}>
                <input type="number" value={form.square_feet} onChange={e => set('square_feet', e.target.value)} placeholder="1200" style={inputStyle} />
              </label>
            </div>

            {/* Door width / height / depth */}
            <div>
              <span style={label('Door Width')}>Door Width</span>
              <FeetInchesInput name="door_width" placeholder="40" value={form.door_width} onChange={e => set(e.target.name as keyof CreateForm, e.target.value)} style={inputStyle} />
            </div>
            <div>
              <span style={label('Door Height')}>Door Height</span>
              <FeetInchesInput name="door_height" placeholder="12" value={form.door_height} onChange={e => set(e.target.name as keyof CreateForm, e.target.value)} style={inputStyle} />
            </div>
            <div>
              <span style={label('Hangar Depth')}>Hangar Depth</span>
              <FeetInchesInput name="hangar_depth" placeholder="45" value={form.hangar_depth} onChange={e => set(e.target.name as keyof CreateForm, e.target.value)} style={inputStyle} />
            </div>

            {/* Contact */}
            <div>
              <label style={label('Contact Name *')}>
                <input required value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="John Smith" style={inputStyle} />
              </label>
            </div>
            <div>
              <label style={label('Contact Email *')}>
                <input required type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="john@example.com" style={inputStyle} />
              </label>
            </div>
            <div style={field(2)}>
              <label style={label('Contact Phone')}>
                <input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="(206) 555-1234" style={inputStyle} />
              </label>
            </div>

            {/* Description */}
            <div style={field(2)}>
              <label style={label('Description')}>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Details about the hangar, lease terms, access, etc."
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </label>
            </div>

            {/* Assign to broker */}
            {brokers.length > 0 && (
              <div style={field(2)}>
                <label style={label('Assign to Broker (optional)')}>
                  <select value={form.broker_profile_id} onChange={e => set('broker_profile_id', e.target.value)} style={inputStyle}>
                    <option value="">— No broker (admin-owned) —</option>
                    {brokers.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.full_name}{b.brokerage ? ` · ${b.brokerage}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>

          {error && (
            <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.85rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '0.825rem', color: '#b91c1c' }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" onClick={onClose} style={btnStyle('#374151', '#f3f4f6', '#d1d5db')}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ ...btnStyle('white', '#1a3a5c', '#1a3a5c'), padding: '0.45rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Creating…' : 'Create Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Assign Broker Popover ────────────────────────────────────────────────────

function AssignBrokerPopover({
  listingId,
  currentBrokerProfileId,
  brokers,
  onClose,
  onAssigned,
}: {
  listingId: string
  currentBrokerProfileId: string | null
  brokers: BrokerOption[]
  onClose: () => void
  onAssigned: (listingId: string, brokerId: string | null, brokerName: string | null) => void
}) {
  const [selected, setSelected] = useState(currentBrokerProfileId ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    const broker = brokers.find(b => b.id === selected)
    try {
      const res = await fetch('/api/admin/listings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: listingId,
          broker_profile_id: selected || null,
          broker_user_id: broker?.user_id ?? null,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed'); return }
      onAssigned(listingId, selected || null, broker?.full_name ?? null)
      onClose()
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem',
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '10px', width: '100%', maxWidth: '420px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)', overflow: 'hidden',
      }}>
        <div style={{ backgroundColor: '#1a3a5c', padding: '0.85rem 1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: '0.875rem' }}>Assign Listing to Broker</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>
        <div style={{ padding: '1rem' }}>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.825rem', color: '#6b7280' }}>
            The broker will be notified and will be able to edit and manage this listing from their dashboard.
          </p>
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            style={{ ...inputStyle, marginBottom: '0.75rem' }}
          >
            <option value="">— Remove broker assignment —</option>
            {brokers.map(b => (
              <option key={b.id} value={b.id}>
                {b.full_name}{b.brokerage ? ` · ${b.brokerage}` : ''}
              </option>
            ))}
          </select>
          {error && <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#dc2626' }}>{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
            <button onClick={onClose} style={btnStyle('#374151', '#f3f4f6', '#d1d5db')}>Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ ...btnStyle('white', '#1a3a5c', '#1a3a5c'), fontWeight: 600, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving…' : 'Save Assignment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function AdminListingsManager({
  initialListings,
  brokers = [],
}: {
  initialListings: AdminListing[]
  brokers?: BrokerOption[]
}) {
  const [listings, setListings] = useState<AdminListing[]>(initialListings)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterState, setFilterState] = useState('all')
  const [actions, setActions] = useState<ActionState>({})
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  // Duration selection per listing for the "Comp sponsor" control. Defaults to 30d.
  const [sponsorDays, setSponsorDays] = useState<Record<string, number>>({})

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

  async function handleGrantSponsor(id: string, days: number) {
    setAction(id + '_sponsor', 'loading')
    try {
      const res = await fetch('/api/admin/listings/sponsor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: id, duration_days: days }),
      })
      if (res.ok) {
        const { sponsored_until } = await res.json() as { sponsored_until: string }
        setListings(prev => prev.map(l =>
          l.id === id ? { ...l, is_sponsored: true, sponsored_until } : l
        ))
        setAction(id + '_sponsor', 'done')
        setTimeout(() => setAction(id + '_sponsor', 'idle'), 2500)
      } else {
        setAction(id + '_sponsor', 'error')
      }
    } catch {
      setAction(id + '_sponsor', 'error')
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

  function handleBrokerAssigned(listingId: string, brokerId: string | null, _brokerName: string | null) {
    setListings(prev => prev.map(l =>
      l.id === listingId ? { ...l, broker_profile_id: brokerId } : l
    ))
  }

  const assigningListing = assigningId ? listings.find(l => l.id === assigningId) ?? null : null

  return (
    <div>
      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showCreate && (
        <CreateListingModal
          brokers={brokers}
          onClose={() => setShowCreate(false)}
          onCreated={listing => setListings(prev => [listing, ...prev])}
        />
      )}
      {assigningListing && (
        <AssignBrokerPopover
          listingId={assigningListing.id}
          currentBrokerProfileId={assigningListing.broker_profile_id}
          brokers={brokers}
          onClose={() => setAssigningId(null)}
          onAssigned={handleBrokerAssigned}
        />
      )}

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
          style={{ ...inputStyle, minWidth: '220px', flex: '1', width: 'auto' }}
        />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="all">All types</option>
          <option value="sale">For Sale</option>
          <option value="lease">For Lease</option>
          <option value="space">Space Available</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="all">All statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
        {states.length > 1 && (
          <select value={filterState} onChange={e => setFilterState(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
            <option value="all">All states</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <span style={{ fontSize: '0.8rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
          {filtered.length} of {listings.length} listing{listings.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => setShowCreate(true)}
          style={{ ...btnStyle('white', '#1a3a5c', '#1a3a5c'), fontWeight: 600, padding: '0.4rem 0.9rem', marginLeft: 'auto' }}
        >
          + Create Listing
        </button>
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
            const assignedBroker = listing.broker_profile_id
              ? brokers.find(b => b.id === listing.broker_profile_id)
              : null

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
                    {assignedBroker && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '0.1rem 0.4rem' }}>
                        🏢 {assignedBroker.full_name}
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
                      style={btnStyle('#374151', listing.is_sample ? '#f3f4f6' : 'white', '#d1d5db')}
                    >
                      {isSampleLoading ? '…' : listing.is_sample ? '🔍 Unmark Sample' : 'Mark as Sample'}
                    </button>
                  )}

                  {/* Comp sponsor (approved only) — bypasses Stripe. Used to honour */}
                  {/* the founding-broker promise of two free sponsorships.         */}
                  {listing.status === 'approved' && (() => {
                    const chosen = sponsorDays[listing.id] ?? 30
                    const sponsorState = actions[listing.id + '_sponsor'] ?? 'idle'
                    const loading = sponsorState === 'loading'
                    const activeUntil = listing.is_sponsored && listing.sponsored_until && new Date(listing.sponsored_until) > new Date()
                      ? new Date(listing.sponsored_until).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : null
                    return (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <select
                          value={chosen}
                          disabled={loading}
                          onChange={e => setSponsorDays(prev => ({ ...prev, [listing.id]: Number(e.target.value) }))}
                          style={{
                            ...btnStyle('#5b21b6', '#faf5ff', '#ddd6fe'),
                            paddingRight: '1.5rem',
                            appearance: 'auto' as const,
                            cursor: 'pointer',
                          }}
                          title={activeUntil ? `Currently sponsored through ${activeUntil}. Granting extends from that date.` : 'Pick duration then click Grant'}
                        >
                          <option value={7}>7 days</option>
                          <option value={30}>30 days</option>
                          <option value={90}>90 days</option>
                        </select>
                        <button
                          disabled={loading}
                          onClick={() => handleGrantSponsor(listing.id, chosen)}
                          style={btnStyle('#5b21b6', 'white', '#ddd6fe')}
                          title={activeUntil
                            ? `Extends current sponsorship (ends ${activeUntil}) by ${chosen} days`
                            : `Grants ${chosen}-day sponsorship starting now`}
                        >
                          {loading ? '…'
                            : sponsorState === 'done'  ? '✓ Sponsored'
                            : sponsorState === 'error' ? 'Retry'
                            : activeUntil              ? `💎 Extend ${chosen}d`
                            :                            `💎 Comp ${chosen}d`}
                        </button>
                      </span>
                    )
                  })()}

                  {/* Assign broker */}
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
    </div>
  )
}
