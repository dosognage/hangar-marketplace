'use client'

import { useState } from 'react'
import Link from 'next/link'

export type AdminBrokerProfile = {
  id:                  string
  user_id:             string | null
  full_name:           string
  brokerage:           string
  license_state:       string
  license_number:      string | null
  is_hidden:           boolean
  is_verified:         boolean
  is_founding_broker:  boolean
  avatar_url:          string | null
  created_at:          string
  listing_count:       number
}

export default function AdminBrokersManager({ brokers: initial }: { brokers: AdminBrokerProfile[] }) {
  const [brokers, setBrokers] = useState<AdminBrokerProfile[]>(initial)
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  async function toggleFounding(profile: AdminBrokerProfile) {
    setLoading(prev => ({ ...prev, [`f_${profile.id}`]: true }))
    const res = await fetch('/api/admin/broker-profiles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: profile.id, is_founding_broker: !profile.is_founding_broker }),
    })
    if (res.ok) {
      setBrokers(prev =>
        prev.map(b => b.id === profile.id ? { ...b, is_founding_broker: !b.is_founding_broker } : b)
      )
    }
    setLoading(prev => ({ ...prev, [`f_${profile.id}`]: false }))
  }

  async function toggleVerified(profile: AdminBrokerProfile) {
    setLoading(prev => ({ ...prev, [`v_${profile.id}`]: true }))
    const res = await fetch('/api/admin/broker-profiles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: profile.id, is_verified: !profile.is_verified }),
    })
    if (res.ok) {
      setBrokers(prev =>
        prev.map(b => b.id === profile.id ? { ...b, is_verified: !b.is_verified } : b)
      )
    }
    setLoading(prev => ({ ...prev, [`v_${profile.id}`]: false }))
  }

  async function toggleVisibility(profile: AdminBrokerProfile) {
    setLoading(prev => ({ ...prev, [profile.id]: true }))
    try {
      const res = await fetch('/api/admin/broker-profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile.id, is_hidden: !profile.is_hidden }),
      })
      if (res.ok) {
        setBrokers(prev =>
          prev.map(b => b.id === profile.id ? { ...b, is_hidden: !b.is_hidden } : b)
        )
      }
    } finally {
      setLoading(prev => ({ ...prev, [profile.id]: false }))
    }
  }

  if (brokers.length === 0) {
    return (
      <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>
        No broker profiles yet.
      </p>
    )
  }

  const visible = brokers.filter(b => !b.is_hidden).length
  const hidden  = brokers.filter(b =>  b.is_hidden).length

  return (
    <div>
      {/* Summary */}
      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#6b7280' }}>
        <span><strong style={{ color: '#111827' }}>{brokers.length}</strong> total</span>
        <span><strong style={{ color: '#15803d' }}>{visible}</strong> visible</span>
        {hidden > 0 && <span><strong style={{ color: '#6b7280' }}>{hidden}</strong> hidden</span>}
      </div>

      <div style={{ display: 'grid', gap: '0.6rem' }}>
        {brokers.map(broker => {
          const isLoading = !!loading[broker.id]
          return (
            <div key={broker.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              backgroundColor: broker.is_hidden ? '#f9fafb' : 'white',
              opacity: broker.is_hidden ? 0.7 : 1,
              flexWrap: 'wrap',
            }}>
              {/* Left: avatar + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '200px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                  backgroundColor: '#1a3a5c', overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '0.95rem', fontWeight: '700',
                  border: '2px solid #e5e7eb',
                }}>
                  {broker.avatar_url
                    ? <img src={broker.avatar_url} alt={broker.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : broker.full_name.charAt(0).toUpperCase()
                  }
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#111827' }}>{broker.full_name}</span>
                    {broker.is_founding_broker && (
                      <span style={{
                        fontSize: '0.68rem', fontWeight: '700',
                        backgroundColor: '#fef9c3', color: '#854d0e',
                        border: '1px solid #fde68a', borderRadius: '4px',
                        padding: '0.1rem 0.4rem',
                      }}>
                        ✦ FOUNDING
                      </span>
                    )}
                    {broker.is_verified && (
                      <span style={{
                        fontSize: '0.68rem', fontWeight: '700',
                        backgroundColor: '#dbeafe', color: '#1e40af',
                        border: '1px solid #bfdbfe', borderRadius: '4px',
                        padding: '0.1rem 0.4rem',
                      }}>
                        VERIFIED
                      </span>
                    )}
                    {broker.is_hidden && (
                      <span style={{
                        fontSize: '0.68rem', fontWeight: '700',
                        backgroundColor: '#f3f4f6', color: '#6b7280',
                        border: '1px solid #d1d5db', borderRadius: '4px',
                        padding: '0.1rem 0.4rem',
                      }}>
                        HIDDEN
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#6b7280' }}>
                    {broker.brokerage} · Licensed in {broker.license_state}
                    {broker.license_number && ` · #${broker.license_number}`}
                    {broker.listing_count > 0 && ` · ${broker.listing_count} listing${broker.listing_count !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>

              {/* Right: actions */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                <button
                  disabled={!!loading[`f_${broker.id}`]}
                  onClick={() => toggleFounding(broker)}
                  title={broker.is_founding_broker ? 'Remove founding badge' : 'Grant founding broker badge'}
                  style={{
                    fontSize: '0.78rem', fontWeight: '600',
                    padding: '0.3rem 0.7rem', borderRadius: '6px',
                    cursor: loading[`f_${broker.id}`] ? 'not-allowed' : 'pointer',
                    border: broker.is_founding_broker ? '1px solid #fde68a' : '1px solid #d1d5db',
                    backgroundColor: broker.is_founding_broker ? '#fef9c3' : '#f9fafb',
                    color: broker.is_founding_broker ? '#854d0e' : '#374151',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {loading[`f_${broker.id}`] ? '…' : broker.is_founding_broker ? '✦ Founding' : '✦ Founding'}
                </button>
                <Link
                  href={`/broker/${broker.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '0.78rem', color: '#6366f1',
                    textDecoration: 'none', fontWeight: '500',
                    padding: '0.3rem 0.7rem',
                    border: '1px solid #c7d2fe', borderRadius: '6px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  View ↗
                </Link>
                <button
                  disabled={!!loading[`v_${broker.id}`]}
                  onClick={() => toggleVerified(broker)}
                  title={broker.is_verified ? 'Remove verification' : `Verify${broker.license_number ? ` (License: #${broker.license_number})` : ''}`}
                  style={{
                    fontSize: '0.78rem', fontWeight: '600',
                    padding: '0.3rem 0.7rem', borderRadius: '6px',
                    cursor: loading[`v_${broker.id}`] ? 'not-allowed' : 'pointer',
                    border: broker.is_verified ? '1px solid #bfdbfe' : '1px solid #d1d5db',
                    backgroundColor: broker.is_verified ? '#dbeafe' : '#f9fafb',
                    color: broker.is_verified ? '#1e40af' : '#374151',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {broker.is_verified ? '✓ Verified' : 'Verify'}
                </button>
                <button
                  disabled={isLoading}
                  onClick={() => toggleVisibility(broker)}
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    padding: '0.3rem 0.7rem',
                    borderRadius: '6px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    border: broker.is_hidden
                      ? '1px solid #bbf7d0'
                      : '1px solid #d1d5db',
                    backgroundColor: broker.is_hidden ? '#f0fdf4' : '#f9fafb',
                    color: broker.is_hidden ? '#15803d' : '#374151',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isLoading ? '…' : broker.is_hidden ? '👁 Show' : 'Hide'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
