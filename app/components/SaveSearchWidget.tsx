'use client'

/**
 * SaveSearchWidget
 *
 * Shown below the search filters on the home page.
 * Lets visitors subscribe to email alerts when new listings
 * match their current search criteria.
 */

import { useState } from 'react'

type Props = {
  query?: string
  listingType?: string
  maxPrice?: string
  minSqft?: string
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function SaveSearchWidget({ query, listingType, maxPrice, minSqft }: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [open, setOpen] = useState(false)

  const hasFilters = Boolean(query || listingType || maxPrice || minSqft)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('loading')

    try {
      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, query, listingType, maxPrice, minSqft }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div style={pillStyle}>
        <span style={{ fontSize: '1rem' }}>✅</span>
        <span style={{ fontSize: '0.875rem', color: '#166534', fontWeight: '600' }}>
          You&apos;re subscribed! We&apos;ll email you when matching hangars are listed.
        </span>
      </div>
    )
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={triggerStyle}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {hasFilters ? 'Get alerts for this search' : 'Get alerts for new listings'}
      </button>
    )
  }

  return (
    <div style={formWrapStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
          {hasFilters ? 'Alert me when matching hangars are listed' : 'Alert me when new hangars are listed'}
        </p>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1.1rem', lineHeight: 1, padding: 0 }}>×</button>
      </div>

      {hasFilters && (
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: '#6b7280' }}>
          Filters: {[
            query && `"${query}"`,
            listingType && listingType,
            maxPrice && `max $${parseInt(maxPrice).toLocaleString()}`,
            minSqft && `min ${parseInt(minSqft).toLocaleString()} sq ft`,
          ].filter(Boolean).join(' · ')}
        </p>
      )}

      {status === 'error' && (
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: '#dc2626' }}>
          Something went wrong. Please try again.
        </p>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '0.55rem 0.85rem',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '0.9rem',
            backgroundColor: '#f9fafb',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          style={{
            padding: '0.55rem 1.25rem',
            backgroundColor: '#111827',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {status === 'loading' ? 'Saving…' : 'Notify me'}
        </button>
      </form>
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.72rem', color: '#9ca3af' }}>
        One email per new match. Unsubscribe any time (link in every email).
      </p>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────

const pillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 0.85rem',
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '999px',
}

const triggerStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  padding: '0.45rem 0.9rem',
  backgroundColor: 'white',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: '999px',
  fontSize: '0.825rem',
  fontWeight: '500',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const formWrapStyle: React.CSSProperties = {
  backgroundColor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '1rem 1.25rem',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
}
