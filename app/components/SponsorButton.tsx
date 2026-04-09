'use client'

/**
 * SponsorButton
 *
 * Shown on the listing detail page to let owners (or anyone) pay to have
 * their listing pinned to the top of the browse board for their area.
 *
 * Tiers: 7 days ($29), 30 days ($79), 90 days ($149)
 */

import { useState } from 'react'
import { SPONSOR_TIERS } from '@/lib/stripe'

type Props = {
  listingId: string
  /** If the listing is currently sponsored, show expiry instead of the picker */
  sponsoredUntil?: string | null
  /** If the listing has a Stripe customer, show Manage billing link */
  hasStripeCustomer?: boolean
}

export default function SponsorButton({ listingId, sponsoredUntil, hasStripeCustomer }: Props) {
  const [open, setOpen] = useState(false)
  const [selectedDays, setSelectedDays] = useState<number>(30)
  const [loading, setLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  const isActive = sponsoredUntil != null && new Date(sponsoredUntil) > new Date()
  const expiresLabel = isActive && sponsoredUntil
    ? new Date(sponsoredUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  async function openBillingPortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error ?? 'Could not open billing portal. Please try again.')
        setPortalLoading(false)
      }
    } catch {
      alert('Network error. Please try again.')
      setPortalLoading(false)
    }
  }

  async function startCheckout() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/sponsor-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, duration_days: selectedDays }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error ?? 'Could not start checkout. Please try again.')
        setLoading(false)
      }
    } catch {
      alert('Network error. Please try again.')
      setLoading(false)
    }
  }

  // ── Currently sponsored ──────────────────────────────────────────────────
  if (isActive) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.45rem 0.85rem',
          backgroundColor: '#eef2ff', border: '1px solid #c7d2fe',
          borderRadius: '8px', fontSize: '0.82rem',
        }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: '#6366f1', flexShrink: 0,
          }} />
          <span style={{ color: '#4338ca', fontWeight: '600' }}>
            Sponsored · expires {expiresLabel}
          </span>
        </div>
        {hasStripeCustomer && (
          <button
            onClick={openBillingPortal}
            disabled={portalLoading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.45rem 0.85rem',
              backgroundColor: 'white', border: '1px solid #d1d5db',
              borderRadius: '8px', fontSize: '0.82rem', fontWeight: '500',
              color: '#374151', cursor: portalLoading ? 'default' : 'pointer',
            }}
          >
            {portalLoading ? 'Opening…' : 'Manage billing →'}
          </button>
        )}
      </div>
    )
  }

  // ── Collapsed trigger ────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.45rem 0.9rem',
          backgroundColor: '#6366f1', color: 'white',
          border: 'none', borderRadius: '8px',
          fontSize: '0.825rem', fontWeight: '600', cursor: 'pointer',
        }}
      >
        Sponsor this listing
      </button>
    )
  }

  // ── Expanded picker ──────────────────────────────────────────────────────
  return (
    <div style={{
      border: '1px solid #c7d2fe',
      borderRadius: '10px',
      padding: '1.25rem',
      backgroundColor: '#f5f3ff',
      maxWidth: '400px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <p style={{ margin: 0, fontWeight: '700', fontSize: '0.95rem', color: '#111827' }}>
          Sponsor this listing
        </p>
        <button
          onClick={() => setOpen(false)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1rem', padding: 0 }}
        >✕</button>
      </div>
      <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.6 }}>
        Your listing will be pinned to the top of the browse board for searchers in your area and shown with a purple <strong>Sponsored</strong> marker on the map.
      </p>

      {/* Tier selector */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {SPONSOR_TIERS.map(tier => (
          <button
            key={tier.days}
            onClick={() => setSelectedDays(tier.days)}
            style={{
              flex: 1, minWidth: '90px',
              padding: '0.6rem 0.5rem',
              border: `2px solid ${selectedDays === tier.days ? '#6366f1' : '#d1d5db'}`,
              borderRadius: '8px',
              backgroundColor: selectedDays === tier.days ? '#eef2ff' : 'white',
              color: selectedDays === tier.days ? '#4338ca' : '#374151',
              cursor: 'pointer', textAlign: 'center',
              transition: 'border-color 0.15s, background-color 0.15s',
            }}
          >
            <div style={{ fontWeight: '700', fontSize: '1rem', color: selectedDays === tier.days ? '#4338ca' : '#111827' }}>
              {tier.price}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.1rem' }}>
              {tier.label}
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={startCheckout}
        disabled={loading}
        style={{
          width: '100%',
          padding: '0.65rem',
          backgroundColor: loading ? '#818cf8' : '#6366f1',
          color: 'white', border: 'none',
          borderRadius: '8px', fontWeight: '700',
          fontSize: '0.875rem', cursor: loading ? 'default' : 'pointer',
        }}
      >
        {loading ? 'Redirecting to checkout…' : `Sponsor for ${SPONSOR_TIERS.find(t => t.days === selectedDays)?.label} (${SPONSOR_TIERS.find(t => t.days === selectedDays)?.price})`}
      </button>

      <p style={{ margin: '0.6rem 0 0', fontSize: '0.72rem', color: '#9ca3af', textAlign: 'center' }}>
        Secured by Stripe · cancel anytime before payment
      </p>
    </div>
  )
}
