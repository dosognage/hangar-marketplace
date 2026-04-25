'use client'

/**
 * Shared broker-assignment popover used by both AdminListingsManager (hangars)
 * and AdminHomesManager (airport homes / land / fly-in communities).
 *
 * Saves to the same /api/admin/listings PATCH endpoint, which doesn't care
 * about property_type — it operates on a listing id directly.
 */

import { useState } from 'react'

export type BrokerOption = {
  id:        string
  user_id:   string
  full_name: string
  brokerage: string | null
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

const btn = (color: string, bg: string, border: string): React.CSSProperties => ({
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

export default function AssignBrokerPopover({
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
  const [error, setError]   = useState('')

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
            <button onClick={onClose} style={btn('#374151', '#f3f4f6', '#d1d5db')}>Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ ...btn('white', '#1a3a5c', '#1a3a5c'), fontWeight: 600, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving…' : 'Save Assignment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
