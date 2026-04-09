'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'

type Props = {
  listingId: string
  isFeatured: boolean
  featuredUntil: string | null
}

export default function FeatureButton({ listingId, isFeatured, featuredUntil }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [days, setDays] = useState('30')

  const expiryLabel = featuredUntil
    ? new Date(featuredUntil) > new Date()
      ? `Expires ${new Date(featuredUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : 'Expired'
    : null

  async function toggle(feature: boolean) {
    setLoading(true)
    const res = await fetch('/api/admin/feature', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: listingId, is_featured: feature, days: feature ? Number(days) : 0 }),
    })
    setLoading(false)
    if (res.ok) {
      router.refresh()
    } else {
      alert('Failed to update featured status.')
    }
  }

  if (isFeatured) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
          padding: '0.2rem 0.6rem', borderRadius: '999px',
          backgroundColor: '#fef3c7', color: '#92400e',
          fontSize: '0.75rem', fontWeight: '700',
        }}>
          <Star size={11} style={{ flexShrink: 0 }} /> Featured {expiryLabel ? `· ${expiryLabel}` : ''}
        </span>
        <button
          onClick={() => toggle(false)}
          disabled={loading}
          style={{
            padding: '0.25rem 0.65rem', fontSize: '0.75rem', fontWeight: '600',
            border: '1px solid #d1d5db', borderRadius: '6px',
            backgroundColor: 'white', color: '#374151', cursor: 'pointer',
          }}
        >
          {loading ? '…' : 'Unfeature'}
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
      <select
        value={days}
        onChange={(e) => setDays(e.target.value)}
        disabled={loading}
        style={{
          padding: '0.25rem 0.5rem', fontSize: '0.75rem',
          border: '1px solid #d1d5db', borderRadius: '6px',
          backgroundColor: 'white', color: '#374151',
        }}
      >
        <option value="7">7 days</option>
        <option value="14">14 days</option>
        <option value="30">30 days</option>
        <option value="60">60 days</option>
        <option value="90">90 days</option>
      </select>
      <button
        onClick={() => toggle(true)}
        disabled={loading}
        style={{
          padding: '0.25rem 0.65rem', fontSize: '0.75rem', fontWeight: '600',
          border: '1px solid #f59e0b', borderRadius: '6px',
          backgroundColor: '#fef3c7', color: '#92400e', cursor: 'pointer',
        }}
      >
        {loading ? '…' : <><Star size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />Feature</>}
      </button>
    </div>
  )
}
