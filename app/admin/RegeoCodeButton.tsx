'use client'

import { useState } from 'react'
import { MapPin } from 'lucide-react'

type Failure = { id: string; airport_code: string; status: string }

export default function ReGeocodeButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [summary, setSummary] = useState('')
  const [failures, setFailures] = useState<Failure[]>([])

  async function run() {
    setStatus('loading')
    setSummary('')
    setFailures([])
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
      setFailures(Array.isArray(data.failures) ? data.failures : [])
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

      {/* Failures detail — surface so admin can identify which listings need
          a manual coords fix or a missing airport row. */}
      {failures.length > 0 && (
        <div style={{ width: '100%', marginTop: '0.5rem' }}>
          <details>
            <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: '#1d4ed8', fontWeight: 600 }}>
              Show failed listings ({failures.length})
            </summary>
            <table style={{
              marginTop: '0.5rem', borderCollapse: 'collapse',
              fontSize: '0.78rem', width: '100%', maxWidth: '720px',
            }}>
              <thead>
                <tr style={{ backgroundColor: '#eff6ff', textAlign: 'left' }}>
                  <th style={cellStyle}>Airport code</th>
                  <th style={cellStyle}>Listing ID</th>
                  <th style={cellStyle}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {failures.map(f => (
                  <tr key={f.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={cellStyle}>
                      <code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: '3px' }}>
                        {f.airport_code || '(empty)'}
                      </code>
                    </td>
                    <td style={{ ...cellStyle, fontFamily: 'monospace', color: '#6b7280' }}>
                      {f.id.slice(0, 8)}…
                    </td>
                    <td style={cellStyle}>{f.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.72rem', color: '#9ca3af', maxWidth: '520px', lineHeight: 1.5 }}>
              These airport codes weren&apos;t found in the airports table, AviationWeather.gov, or Nominatim. Likely fix:
              add the missing airport row in Supabase, or correct the listing&apos;s airport code if it&apos;s a typo.
            </p>
          </details>
        </div>
      )}
    </div>
  )
}

const cellStyle: React.CSSProperties = {
  padding: '6px 10px',
  textAlign: 'left',
  verticalAlign: 'top',
}
