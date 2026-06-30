'use client'

/**
 * Initiates a Stripe Checkout Session for one of the host subscription
 * tiers. Used on /dashboard/billing and /pricing's CTA buttons.
 *
 * Server work happens at POST /api/subscriptions/checkout. On success
 * the server returns { url } and we send the browser there to complete
 * payment. The Stripe page handles card collection, 3DS, etc. and
 * redirects back to /dashboard/billing?success=1 on completion.
 */
import { useState } from 'react'
import type { HostTier } from '@/lib/stripe'

interface Props {
  tier:    Exclude<HostTier, 'free'>
  label:   string
  variant?: 'primary' | 'secondary'
}

export default function StartSubscriptionButton({ tier, label, variant = 'primary' }: Props) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function start() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tier }),
      })

      // If they already have a sub, the API returns 409 with portalNeeded.
      // Surface a clear message + path forward.
      if (res.status === 409) {
        setError('You already have an active subscription. Use Manage Subscription below to change tiers.')
        return
      }

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Could not start checkout. Try again.')
        return
      }
      if (data.url) {
        window.location.href = data.url
      } else {
        setError('Could not start checkout. Try again.')
      }
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const colors = variant === 'primary'
    ? { bg: '#1e3a8a', fg: 'white',   border: '#1e3a8a' }
    : { bg: 'white',   fg: '#1e3a8a', border: '#c7d2fe' }

  return (
    <div>
      <button
        onClick={start}
        disabled={loading}
        style={{
          width: '100%',
          padding: '0.85rem 1.25rem',
          backgroundColor: loading ? '#9ca3af' : colors.bg,
          color: colors.fg,
          border: `1px solid ${colors.border}`,
          borderRadius: '10px',
          fontSize: '0.95rem',
          fontWeight: 700,
          cursor: loading ? 'default' : 'pointer',
        }}
      >
        {loading ? 'Opening Stripe…' : label}
      </button>
      {error && (
        <p style={{ margin: '0.5rem 0 0', color: '#b91c1c', fontSize: '0.8rem' }}>{error}</p>
      )}
    </div>
  )
}
