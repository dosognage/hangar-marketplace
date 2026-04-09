'use client'

import { useState } from 'react'

type Props = {
  listingId: string
}

export default function ManageBillingButton({ listingId }: Props) {
  const [loading, setLoading] = useState(false)

  async function openPortal() {
    setLoading(true)
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
        alert(data.error ?? 'Could not open billing portal.')
        setLoading(false)
      }
    } catch {
      alert('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={openPortal}
      disabled={loading}
      style={{
        fontSize: '0.8rem', color: '#4338ca', textDecoration: 'none',
        fontWeight: '500', whiteSpace: 'nowrap',
        padding: '0.35rem 0.85rem',
        border: '1px solid #c7d2fe', borderRadius: '6px',
        backgroundColor: '#eef2ff', cursor: loading ? 'default' : 'pointer',
      }}
    >
      {loading ? 'Opening…' : 'Manage billing →'}
    </button>
  )
}
