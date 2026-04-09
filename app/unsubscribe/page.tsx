'use client'

import { useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import Link from 'next/link'

function UnsubscribeContent() {
  const params  = useSearchParams()
  const status  = params.get('status') // 'success' | 'error' | null (manual form)

  const [email, setEmail]     = useState('')
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleManual(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error('Could not find that email.')
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  // ── Token-based one-click result ────────────────────────────────────────
  if (status === 'success') {
    return (
      <Result
        icon="✓"
        iconColor="#34d399"
        title="You've been unsubscribed"
        body="You won't receive any more marketing emails from Hangar Marketplace. If this was a mistake you can re-subscribe any time from the footer of our site."
      />
    )
  }

  if (status === 'error') {
    return (
      <Result
        icon="✕"
        iconColor="#f87171"
        title="Link not recognised"
        body="That unsubscribe link may have already been used or has expired. Enter your email below to unsubscribe manually."
      >
        <ManualForm email={email} setEmail={setEmail} loading={loading} done={done} error={error} onSubmit={handleManual} />
      </Result>
    )
  }

  // ── Manual unsubscribe (no token in URL) ────────────────────────────────
  return (
    <div style={cardStyle}>
      <h1 style={headingStyle}>Unsubscribe from emails</h1>
      <p style={bodyStyle}>
        Enter your email address and we'll remove you from our marketing list immediately.
      </p>
      <ManualForm email={email} setEmail={setEmail} loading={loading} done={done} error={error} onSubmit={handleManual} />
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────

function ManualForm({
  email, setEmail, loading, done, error, onSubmit,
}: {
  email: string
  setEmail: (v: string) => void
  loading: boolean
  done: boolean
  error: string
  onSubmit: (e: React.FormEvent) => void
}) {
  if (done) {
    return <p style={{ color: '#34d399', fontSize: '0.9rem', marginTop: '1rem' }}>✓ You've been unsubscribed successfully.</p>
  }
  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem' }}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        style={{
          padding: '0.55rem 0.75rem',
          fontSize: '0.875rem',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
      {error && <p style={{ margin: 0, color: '#dc2626', fontSize: '0.8rem' }}>{error}</p>}
      <button
        type="submit"
        disabled={loading || !email}
        style={{
          padding: '0.55rem 1.25rem',
          fontSize: '0.875rem',
          fontWeight: '600',
          backgroundColor: '#dc2626',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: loading || !email ? 'default' : 'pointer',
          opacity: !email ? 0.5 : 1,
        }}
      >
        {loading ? 'Processing…' : 'Unsubscribe'}
      </button>
    </form>
  )
}

function Result({
  icon, iconColor, title, body, children,
}: {
  icon: string
  iconColor: string
  title: string
  body: string
  children?: React.ReactNode
}) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: '2.5rem', color: iconColor, marginBottom: '0.75rem' }}>{icon}</div>
      <h1 style={headingStyle}>{title}</h1>
      <p style={bodyStyle}>{body}</p>
      {children}
      <Link href="/" style={{ display: 'inline-block', marginTop: '1.5rem', color: '#2563eb', fontSize: '0.875rem' }}>
        ← Back to Hangar Marketplace
      </Link>
    </div>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  maxWidth: '480px',
  margin: '4rem auto',
  padding: '2.5rem',
  backgroundColor: 'white',
  borderRadius: '12px',
  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  border: '1px solid #e5e7eb',
  textAlign: 'center',
}

const headingStyle: React.CSSProperties = {
  margin: '0 0 0.75rem',
  fontSize: '1.35rem',
  fontWeight: '700',
  color: '#111827',
}

const bodyStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '0.9rem',
  color: '#6b7280',
  lineHeight: 1.6,
}

// ── Page export ──────────────────────────────────────────────────────────

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeContent />
    </Suspense>
  )
}
