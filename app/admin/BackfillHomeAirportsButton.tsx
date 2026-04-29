'use client'

import { useState } from 'react'
import { MapPin } from 'lucide-react'

type Failure = { user_id: string; code: string; reason: string }

/**
 * Admin button that triggers the one-time-ish home-airport backfill.
 * Idempotent — running it twice is safe; users already with coords are skipped.
 */
export default function BackfillHomeAirportsButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [summary, setSummary] = useState('')
  const [failures, setFailures] = useState<Failure[]>([])

  async function run() {
    setStatus('loading')
    setSummary('Geocoding airports… this can take a minute if there are many users.')
    setFailures([])
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

      {/* Failures detail — surface so admin can identify which airports/users
          to fix manually. */}
      {failures.length > 0 && (
        <div style={{ width: '100%', marginTop: '0.5rem' }}>
          <details>
            <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: '#5b21b6', fontWeight: 600 }}>
              Show failed users ({failures.length})
            </summary>
            <table style={{
              marginTop: '0.5rem',
              borderCollapse: 'collapse',
              fontSize: '0.78rem',
              width: '100%',
              maxWidth: '720px',
            }}>
              <thead>
                <tr style={{ backgroundColor: '#faf5ff', textAlign: 'left' }}>
                  <th style={cellStyle}>Airport code</th>
                  <th style={cellStyle}>User ID</th>
                  <th style={cellStyle}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {failures.map((f, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={cellStyle}>
                      <code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: '3px' }}>
                        {f.code || '(empty)'}
                      </code>
                    </td>
                    <td style={{ ...cellStyle, fontFamily: 'monospace', color: '#6b7280' }}>
                      {f.user_id.slice(0, 8)}…
                    </td>
                    <td style={cellStyle}>{f.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.72rem', color: '#9ca3af', maxWidth: '520px', lineHeight: 1.5 }}>
              Most failures are 3-letter FAA LIDs that aren&apos;t in the airports table and that Nominatim can&apos;t resolve from the code alone. Add the airport row manually in Supabase, or ask the user to re-save their home airport so the live geocoder runs again.
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
