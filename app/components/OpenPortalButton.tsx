'use client'

/**
 * Sends the host to Stripe's Customer Portal where they can switch
 * tiers, update card, or cancel. Stripe hosts the entire experience;
 * we just provide a deep link.
 */
import { useState } from 'react'

interface Props {
  label?: string
}

export default function OpenPortalButton({ label = 'Manage subscription' }: Props) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function open() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/subscriptions/portal', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Could not open billing portal.')
        return
      }
      if (data.url) {
        window.location.href = data.url
      } else {
        setError('Could not open billing portal.')
      }
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={open}
        disabled={loading}
        style={{
          width: '100%',
          padding: '0.75rem 1.25rem',
          backgroundColor: 'white',
          color: '#1e3a8a',
          border: '1px solid #c7d2fe',
          borderRadius: '10px',
          fontSize: '0.9rem',
          fontWeight: 600,
          cursor: loading ? 'default' : 'pointer',
        }}
      >
        {loading ? 'Opening…' : label}
      </button>
      {error && (
        <p style={{ margin: '0.5rem 0 0', color: '#b91c1c', fontSize: '0.8rem' }}>{error}</p>
      )}
    </div>
  )
}
