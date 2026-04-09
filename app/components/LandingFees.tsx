'use client'

/**
 * LandingFees
 *
 * Fetches airport info from our /api/airport-info route and shows
 * a landing fee likelihood indicator plus a link to AirNav for details.
 */

import { useState, useEffect } from 'react'

type AirportInfo = {
  icao: string
  name: string | null
  tower: boolean
  type: string | null
  feeLikelihood: 'unlikely' | 'possible' | 'likely'
  feeNote: string
}

type Props = {
  airportCode: string
  airportName: string
}

export default function LandingFees({ airportCode, airportName }: Props) {
  const [open, setOpen] = useState(false)
  const [info, setInfo] = useState<AirportInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetched, setFetched] = useState(false)

  // Fetch on first open
  useEffect(() => {
    if (!open || fetched) return
    setLoading(true)
    setFetched(true)

    fetch(`/api/airport-info?code=${encodeURIComponent(airportCode)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setInfo(data)
      })
      .catch(() => setError('Could not load airport data.'))
      .finally(() => setLoading(false))
  }, [open, airportCode, fetched])

  const likelihood = info?.feeLikelihood
  const colors = {
    unlikely: { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', label: 'Unlikely' },
    possible: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', label: 'Possible' },
    likely:   { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', label: 'Likely'   },
  }
  const c = likelihood ? colors[likelihood] : null

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '10px',
      marginBottom: '1.5rem',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Tower/dollar icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a3a5c" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#111827' }}>
            Landing fees at {airportCode}
          </span>
          {/* Inline badge once loaded */}
          {c && !open && (
            <span style={{
              fontSize: '0.7rem', fontWeight: '700',
              padding: '0.15rem 0.5rem', borderRadius: '999px',
              backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}`,
            }}>
              {c.label}
            </span>
          )}
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Body */}
      {open && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid #f3f4f6' }}>
          {loading && (
            <p style={{ margin: '0.75rem 0', fontSize: '0.875rem', color: '#6b7280' }}>
              Looking up airport data…
            </p>
          )}

          {error && (
            <p style={{ margin: '0.75rem 0', fontSize: '0.875rem', color: '#dc2626' }}>
              {error}. Check <AirNavLink code={airportCode} /> for details.
            </p>
          )}

          {info && c && (
            <div style={{ marginTop: '0.75rem' }}>
              {/* Likelihood pill */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.45rem 0.9rem', borderRadius: '8px', marginBottom: '0.75rem',
                backgroundColor: c.bg, border: `1px solid ${c.border}`,
              }}>
                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: c.text }}>
                  Landing fees: {c.label}
                </span>
              </div>

              {/* Note */}
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#374151', lineHeight: 1.6 }}>
                {info.feeNote}
              </p>

              {/* Airport details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.85rem' }}>
                <InfoRow label="Airport" value={info.name ?? airportName} />
                <InfoRow label="ICAO code" value={info.icao} />
                <InfoRow label="Tower" value={info.tower ? 'Yes (towered)' : 'No (non-towered)'} />
                {info.type && <InfoRow label="Type" value={info.type} />}
              </div>

              {/* Disclaimer + AirNav link */}
              <div style={{
                backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: '6px', padding: '0.65rem 0.85rem',
              }}>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
                  ⚠ Fee data is estimated from airport type and is not a guarantee.
                  Always verify with the airport authority or FBO before flying.
                  {' '}
                  <AirNavLink code={airportCode} /> has current fee information.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.82rem' }}>
      <span style={{ color: '#9ca3af', fontWeight: '600', minWidth: '80px' }}>{label}:</span>
      <span style={{ color: '#111827' }}>{value}</span>
    </div>
  )
}

function AirNavLink({ code }: { code: string }) {
  return (
    <a
      href={`https://www.airnav.com/airport/${code}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}
    >
      AirNav ({code}) ↗
    </a>
  )
}
