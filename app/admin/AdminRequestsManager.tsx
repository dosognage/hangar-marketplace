'use client'

import { useState, useMemo } from 'react'
import { Zap, Plane, DollarSign, Calendar } from 'lucide-react'

export type AdminRequest = {
  id: string
  contact_name: string
  contact_email: string
  contact_phone: string | null
  airport_code: string
  airport_name: string | null
  city: string | null
  state: string | null
  aircraft_type: string | null
  wingspan_ft: number | null
  monthly_budget: number | null
  duration: string | null
  move_in_date: string | null
  notes: string | null
  status: string
  is_priority: boolean
  created_at: string
}

const STATUS_OPTIONS = ['active', 'open', 'pending_payment', 'closed', 'expired']

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  active:          { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  open:            { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' },
  pending_payment: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  closed:          { bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' },
  expired:         { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
}

export default function AdminRequestsManager({ initialRequests }: { initialRequests: AdminRequest[] }) {
  const [requests, setRequests] = useState<AdminRequest[]>(initialRequests)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [editing, setEditing] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState<Record<string, string>>({})
  const [editPriority, setEditPriority] = useState<Record<string, boolean>>({})
  const [editNotes, setEditNotes] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return requests.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (
          !r.contact_name.toLowerCase().includes(q) &&
          !r.contact_email.toLowerCase().includes(q) &&
          !r.airport_code.toLowerCase().includes(q) &&
          !(r.airport_name ?? '').toLowerCase().includes(q) &&
          !(r.state ?? '').toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [requests, filterStatus, search])

  function startEdit(r: AdminRequest) {
    setEditing(r.id)
    setEditStatus(prev => ({ ...prev, [r.id]: r.status }))
    setEditPriority(prev => ({ ...prev, [r.id]: r.is_priority }))
    setEditNotes(prev => ({ ...prev, [r.id]: r.notes ?? '' }))
  }

  async function handleSave(id: string) {
    setSaving(id)
    const res = await fetch('/api/admin/requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        status: editStatus[id],
        is_priority: editPriority[id],
        notes: editNotes[id] || null,
      }),
    })
    setSaving(null)
    if (res.ok) {
      setRequests(prev => prev.map(r => r.id === id
        ? { ...r, status: editStatus[id], is_priority: editPriority[id], notes: editNotes[id] || null }
        : r
      ))
      setEditing(null)
    } else {
      alert('Failed to save. Try again.')
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    const res = await fetch(`/api/admin/requests?id=${id}`, { method: 'DELETE' })
    setDeleting(null)
    if (res.ok) {
      setRequests(prev => prev.filter(r => r.id !== id))
      setConfirmDelete(null)
    } else {
      alert('Failed to delete. Try again.')
    }
  }

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of requests) counts[r.status] = (counts[r.status] ?? 0) + 1
    return counts
  }, [requests])

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
        <input
          placeholder="Search name, email, airport…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '0.4rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px',
            fontSize: '0.825rem', flex: '1', minWidth: '180px',
          }}
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '0.4rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.825rem' }}
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s} {statusCounts[s] ? `(${statusCounts[s]})` : ''}</option>
          ))}
        </select>
        <span style={{ fontSize: '0.8rem', color: '#6b7280', marginLeft: 'auto' }}>
          {filtered.length} of {requests.length}
        </span>
      </div>

      {filtered.length === 0 && (
        <p style={{ color: '#6b7280', fontSize: '0.875rem', padding: '1rem 0' }}>No requests found.</p>
      )}

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {filtered.map(r => {
          const isEditing = editing === r.id
          const sc = STATUS_COLORS[r.status] ?? STATUS_COLORS.closed
          const daysAgo = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000)

          return (
            <div key={r.id} style={{
              border: `1px solid ${isEditing ? '#6366f1' : '#e5e7eb'}`,
              borderRadius: '8px', padding: '1rem',
              backgroundColor: isEditing ? '#fafaff' : 'white',
              transition: 'border-color 0.15s',
            }}>
              {/* Top row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {r.is_priority && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                        padding: '0.1rem 0.45rem', borderRadius: '999px',
                        backgroundColor: '#f59e0b', color: 'white',
                        fontSize: '0.65rem', fontWeight: '800',
                      }}>
                        <Zap size={9} /> Priority
                      </span>
                    )}
                    <span style={{ fontWeight: '700', color: '#111827' }}>{r.airport_code}</span>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{r.airport_name}{r.city ? `, ${r.city}, ${r.state}` : ''}</span>
                  </div>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
                    {r.contact_name} · {r.contact_email}{r.contact_phone ? ` · ${r.contact_phone}` : ''} · {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <span style={{
                    padding: '0.15rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '700',
                    backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                  }}>
                    {r.status}
                  </span>
                  {!isEditing && (
                    <>
                      <button
                        onClick={() => startEdit(r)}
                        style={{ padding: '0.3rem 0.7rem', borderRadius: '5px', border: '1px solid #d1d5db', backgroundColor: 'white', fontSize: '0.775rem', fontWeight: '600', cursor: 'pointer', color: '#374151' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDelete(r.id)}
                        style={{ padding: '0.3rem 0.7rem', borderRadius: '5px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', fontSize: '0.775rem', fontWeight: '600', cursor: 'pointer', color: '#dc2626' }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Specs */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: r.notes || isEditing ? '0.6rem' : 0 }}>
                {r.aircraft_type && <Chip icon={<Plane size={11} />} label={r.aircraft_type} />}
                {r.wingspan_ft && <Chip icon={<span style={{ fontSize: '0.7rem' }}>↔</span>} label={`${r.wingspan_ft}′ span`} />}
                {r.monthly_budget && <Chip icon={<DollarSign size={11} />} label={`$${r.monthly_budget.toLocaleString()}/mo`} />}
                {r.duration && <Chip icon={<Calendar size={11} />} label={r.duration} />}
              </div>

              {r.notes && !isEditing && (
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: '#374151', lineHeight: 1.5 }}>{r.notes}</p>
              )}

              {/* Edit panel */}
              {isEditing && (
                <div style={{ display: 'grid', gap: '0.65rem', borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={labelStyle}>Status</label>
                      <select
                        value={editStatus[r.id] ?? r.status}
                        onChange={e => setEditStatus(prev => ({ ...prev, [r.id]: e.target.value }))}
                        style={{ padding: '0.35rem 0.6rem', border: '1px solid #d1d5db', borderRadius: '5px', fontSize: '0.825rem' }}
                      >
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <input
                        type="checkbox"
                        id={`priority-${r.id}`}
                        checked={editPriority[r.id] ?? r.is_priority}
                        onChange={e => setEditPriority(prev => ({ ...prev, [r.id]: e.target.checked }))}
                      />
                      <label htmlFor={`priority-${r.id}`} style={{ fontSize: '0.825rem', fontWeight: '600', color: '#374151', cursor: 'pointer' }}>
                        Priority listing
                      </label>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={labelStyle}>Notes (admin-editable)</label>
                    <textarea
                      value={editNotes[r.id] ?? r.notes ?? ''}
                      onChange={e => setEditNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                      rows={2}
                      style={{ padding: '0.4rem 0.6rem', border: '1px solid #d1d5db', borderRadius: '5px', fontSize: '0.825rem', resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleSave(r.id)}
                      disabled={saving === r.id}
                      style={{ padding: '0.4rem 1rem', backgroundColor: saving === r.id ? '#6b7280' : '#111827', color: 'white', border: 'none', borderRadius: '5px', fontSize: '0.825rem', fontWeight: '700', cursor: saving === r.id ? 'not-allowed' : 'pointer' }}
                    >
                      {saving === r.id ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      style={{ padding: '0.4rem 0.9rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '5px', fontSize: '0.825rem', fontWeight: '600', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Delete confirm */}
              {confirmDelete === r.id && (
                <div style={{
                  marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca', borderRadius: '6px',
                  display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
                }}>
                  <span style={{ fontSize: '0.825rem', color: '#dc2626', fontWeight: '600' }}>
                    Permanently delete this request?
                  </span>
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={deleting === r.id}
                    style={{ padding: '0.3rem 0.8rem', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '5px', fontSize: '0.8rem', fontWeight: '700', cursor: deleting === r.id ? 'not-allowed' : 'pointer' }}
                  >
                    {deleting === r.id ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    style={{ padding: '0.3rem 0.8rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '5px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      padding: '0.2rem 0.55rem', borderRadius: '999px', fontSize: '0.75rem',
      backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', fontWeight: '500',
    }}>
      {icon} {label}
    </span>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.7rem', fontWeight: '700', color: '#6b7280',
  textTransform: 'uppercase', letterSpacing: '0.05em',
}
