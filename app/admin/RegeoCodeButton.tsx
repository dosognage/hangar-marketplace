'use client'

import { useState } from 'react'
import { MapPin } from 'lucide-react'

export default function ReGeocodeButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [summary, setSummary] = useState('')

  async function run() {
    setStatus('loading')
    setSummary('')
    try {
      const res = await fetch('/api/admin/regeocode', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setSummary(data.error ?? 'Unknown error')
        return
      }
      setStatus('done')
      setSummary(`✓ ${data.updated} updated · ${data.skipped} already correct · ${data.failed} failed`)
    } catch {
      setStatus('error')
      setSummary('Network error — try again.')
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
          backgroundColor: '#eff6ff', color: '#1d4ed8',
          border: '1px solid #bfdbfe', fontWeight: '600',
          fontSize: '0.825rem', cursor: status === 'loading' ? 'default' : 'pointer',
          opacity: status === 'loading' ? 0.65 : 1,
        }}
      >
        <MapPin size={14} style={{ flexShrink: 0 }} />
        {status === 'loading' ? 'Geocoding…' : 'Fix map coordinates'}
      </button>
      {summary && (
        <span style={{
          fontSize: '0.8rem',
          color: status === 'error' ? '#dc2626' : '#16a34a',
        }}>
          {summary}
        </span>
      )}
    </div>
  )
}
