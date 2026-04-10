'use client'

/**
 * AdminUsersManager — searchable, filterable table of all registered users.
 *
 * Shows: email, name, signup date, last sign-in, broker status, listing count.
 * Filtering happens entirely client-side since the list is fetched server-side.
 */

import { useState, useMemo, useCallback } from 'react'

export type AdminUser = {
  id: string
  email: string
  display_name: string | null
  created_at: string
  last_sign_in: string | null
  is_broker: boolean
  broker_profile_id: string | null
  listing_count: number
  confirmed: boolean
}

type Props = {
  users: AdminUser[]
}

type DeleteState =
  | { phase: 'idle' }
  | { phase: 'confirm'; user: AdminUser }
  | { phase: 'deleting'; userId: string }
  | { phase: 'error'; message: string }

export default function AdminUsersManager({ users: initialUsers }: Props) {
  const [users, setUsers]   = useState<AdminUser[]>(initialUsers)
  const [query, setQuery]   = useState('')
  const [filter, setFilter] = useState<'all' | 'broker' | 'has_listings' | 'no_listings'>('all')
  const [del, setDel]       = useState<DeleteState>({ phase: 'idle' })

  const handleDeleteClick = useCallback((user: AdminUser) => {
    setDel({ phase: 'confirm', user })
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (del.phase !== 'confirm') return
    const { user } = del
    setDel({ phase: 'deleting', userId: user.id })

    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Delete failed')

      // Remove from local state so the row disappears immediately
      setUsers(prev => prev.filter(u => u.id !== user.id))
      setDel({ phase: 'idle' })
    } catch (err) {
      setDel({ phase: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
    }
  }, [del])

  const handleDeleteCancel = useCallback(() => setDel({ phase: 'idle' }), [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter(u => {
      // Text search
      if (q) {
        const haystack = [u.email, u.display_name].filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      // Status filter
      if (filter === 'broker' && !u.is_broker) return false
      if (filter === 'has_listings' && u.listing_count === 0) return false
      if (filter === 'no_listings' && u.listing_count > 0) return false
      return true
    })
  }, [users, query, filter])

  const brokerCount   = users.filter(u => u.is_broker).length
  const withListings  = users.filter(u => u.listing_count > 0).length

  return (
    <div>
      {/* ── Delete confirmation modal ──────────────────────────────────────── */}
      {(del.phase === 'confirm' || del.phase === 'deleting' || del.phase === 'error') && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          backgroundColor: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '12px',
            padding: '2rem', maxWidth: '420px', width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}>
            {del.phase === 'error' ? (
              <>
                <h3 style={{ margin: '0 0 0.75rem', color: '#dc2626' }}>Delete failed</h3>
                <p style={{ margin: '0 0 1.5rem', color: '#374151', fontSize: '0.9rem' }}>{del.message}</p>
                <button onClick={handleDeleteCancel} style={cancelBtnStyle}>Close</button>
              </>
            ) : (
              <>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚠️</div>
                <h3 style={{ margin: '0 0 0.5rem', color: '#111827' }}>Delete this user?</h3>
                {del.phase === 'confirm' && (
                  <p style={{ margin: '0 0 0.5rem', fontWeight: '600', color: '#374151', fontSize: '0.95rem' }}>
                    {del.user.display_name ?? del.user.email}
                  </p>
                )}
                {del.phase === 'confirm' && (
                  <p style={{ margin: '0 0 0.25rem', color: '#6b7280', fontSize: '0.85rem' }}>
                    {del.user.email}
                  </p>
                )}
                <p style={{ margin: '0.75rem 0 1.5rem', color: '#6b7280', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  This permanently deletes their account, all listings, photos, saved searches, and broker data.
                  <strong style={{ color: '#dc2626' }}> This cannot be undone.</strong>
                </p>
                <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleDeleteCancel}
                    disabled={del.phase === 'deleting'}
                    style={cancelBtnStyle}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={del.phase === 'deleting'}
                    style={{
                      padding: '0.55rem 1.1rem', borderRadius: '7px',
                      backgroundColor: del.phase === 'deleting' ? '#fca5a5' : '#dc2626',
                      color: 'white', border: 'none',
                      fontSize: '0.875rem', fontWeight: '700', cursor: del.phase === 'deleting' ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {del.phase === 'deleting' ? 'Deleting…' : 'Yes, delete permanently'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    <div /* inner wrapper */>
      {/* Summary bar */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total users',      value: users.length },
          { label: 'Verified brokers', value: brokerCount },
          { label: 'Have listings',    value: withListings },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          type="search"
          placeholder="Search by email or name…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            flex: '1 1 220px', padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db', borderRadius: '6px',
            fontSize: '0.875rem', backgroundColor: '#fafafa',
          }}
        />
        {(['all', 'broker', 'has_listings', 'no_listings'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '0.45rem 0.85rem', borderRadius: '6px',
              border: '1px solid',
              borderColor: filter === f ? '#6366f1' : '#d1d5db',
              backgroundColor: filter === f ? '#eef2ff' : 'white',
              color: filter === f ? '#4338ca' : '#374151',
              fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {f === 'all'          ? 'All users'
           : f === 'broker'       ? '⭐ Brokers only'
           : f === 'has_listings' ? 'Have listings'
           :                        'No listings'}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '0 0 0.75rem' }}>
        Showing {filtered.length} of {users.length} users
      </p>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              {['User', 'Signed up', 'Last seen', 'Listings', 'Status', ''].map(h => (
                <th key={h} style={{
                  padding: '0.5rem 0.75rem', textAlign: 'left',
                  fontSize: '0.72rem', fontWeight: '700', color: '#6b7280',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                  No users match your search.
                </td>
              </tr>
            ) : filtered.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>

                {/* User info */}
                <td style={{ padding: '0.65rem 0.75rem', maxWidth: '260px' }}>
                  <div style={{ fontWeight: '600', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.display_name ?? <span style={{ color: '#9ca3af', fontWeight: 400 }}>No name</span>}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.email}
                  </div>
                  {!u.confirmed && (
                    <span style={{
                      display: 'inline-block', marginTop: '2px',
                      background: '#fef3c7', color: '#92400e',
                      fontSize: '0.65rem', fontWeight: '700',
                      padding: '1px 6px', borderRadius: '999px',
                    }}>
                      Unconfirmed
                    </span>
                  )}
                </td>

                {/* Signed up */}
                <td style={{ padding: '0.65rem 0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                  {new Date(u.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </td>

                {/* Last seen */}
                <td style={{ padding: '0.65rem 0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                  {u.last_sign_in
                    ? new Date(u.last_sign_in).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })
                    : <span style={{ color: '#d1d5db' }}>Never</span>
                  }
                </td>

                {/* Listing count */}
                <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                  {u.listing_count > 0 ? (
                    <span style={{
                      background: '#dbeafe', color: '#1d4ed8',
                      fontSize: '0.75rem', fontWeight: '700',
                      padding: '2px 8px', borderRadius: '999px',
                    }}>
                      {u.listing_count}
                    </span>
                  ) : (
                    <span style={{ color: '#d1d5db' }}>—</span>
                  )}
                </td>

                {/* Broker status */}
                <td style={{ padding: '0.65rem 0.75rem' }}>
                  {u.is_broker ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      background: '#dbeafe', color: '#1e40af',
                      fontSize: '0.72rem', fontWeight: '700',
                      padding: '2px 8px', borderRadius: '999px',
                    }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                      Verified Broker
                    </span>
                  ) : (
                    <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Member</span>
                  )}
                </td>

                {/* Actions */}
                <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {u.is_broker && u.broker_profile_id && (
                      <a
                        href={`/broker/${u.broker_profile_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '0.3rem 0.65rem', borderRadius: '5px',
                          background: '#eff6ff', color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          fontSize: '0.75rem', fontWeight: '600',
                          textDecoration: 'none',
                        }}
                      >
                        Profile ↗
                      </a>
                    )}
                    <a
                      href={`/admin?email=${encodeURIComponent(u.email)}`}
                      style={{
                        padding: '0.3rem 0.65rem', borderRadius: '5px',
                        background: '#f3f4f6', color: '#374151',
                        border: '1px solid #e5e7eb',
                        fontSize: '0.75rem', fontWeight: '600',
                        textDecoration: 'none',
                      }}
                    >
                      Listings
                    </a>
                    <button
                      onClick={() => handleDeleteClick(u)}
                      title="Delete user"
                      style={{
                        padding: '0.3rem 0.55rem', borderRadius: '5px',
                        background: 'white', color: '#dc2626',
                        border: '1px solid #fecaca',
                        fontSize: '0.75rem', fontWeight: '600',
                        cursor: 'pointer', lineHeight: 1,
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div> {/* end inner wrapper */}
    </div> {/* end outer wrapper */}
  )
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '0.55rem 1.1rem', borderRadius: '7px',
  backgroundColor: 'white', color: '#374151',
  border: '1px solid #d1d5db',
  fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
}
