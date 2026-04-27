'use client'

import { useState } from 'react'
import { MapPin } from 'lucide-react'

/**
 * Admin button that triggers the one-time-ish home-airport backfill.
 * Idempotent — running it twice is safe; users already with coords are skipped.
 */
export default function BackfillHomeAirportsButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [summary, setSummary] = useState('')

  async function run() {
    setStatus('loading')
    setSummary('Geocoding airports… this can take a minute if there are many users.')
    try {
      const res = await fetch('/api/admin/backfill-home-airports', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setSummary(data.error ?? 'Unknown error')
        return
      }
      setStatus('done')
      setSummary(
        `✓ ${data.backfilled} backfilled · ${data.already_geocoded} already had coords · ${data.failed} failed (of ${data.with_home_airport} users with a home airport)`
      )
    } catch {
      setStatus('error')
      setSummary('Network error. Try again.')
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      <button
        onClick={run}
        disabled={status === 'loading'}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
          padding: '0.45rem 0.9rem', borderRadius: '7px',
          backgroundColor: '#faf5ff', color: '#5b21b6',
          border: '1px solid #ddd6fe', fontWeight: '600',
          fontSize: '0.825rem', cursor: status === 'loading' ? 'default' : 'pointer',
          opacity: status === 'loading' ? 0.65 : 1,
        }}
      >
        <MapPin size={14} style={{ flexShrink: 0 }} />
        {status === 'loading' ? 'Backfilling…' : 'Backfill home-airport coords'}
      </button>
      {summary && (
        <span style={{
          fontSize: '0.8rem',
          color: status === 'error' ? '#dc2626'
               : status === 'done'  ? '#16a34a'
               :                       '#6b7280',
          maxWidth: '520px',
          lineHeight: 1.45,
        }}>
          {summary}
        </span>
      )}
    </div>
  )
}
