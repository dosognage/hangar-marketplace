'use client'

/**
 * FuelPrices
 *
 * Shows expected fuel types at an airport based on airport data from
 * AviationWeather.gov, plus a direct link to AirNav for live prices.
 * We intentionally don't show specific dollar figures because there is
 * no free, real-time fuel price API — AirNav is the authoritative source.
 */

import { useState, useEffect } from 'react'

type AirportInfo = {
  icao: string
  name: string | null
  tower: boolean
  type: string | null
}

type Props = {
  airportCode: string
}

type FuelAvailability = {
  has100LL: boolean
  hasJetA: boolean
  note: string
}

function getFuelAvailability(info: AirportInfo): FuelAvailability {
  const type = (info.type ?? '').toLowerCase()
  const isMilitary   = type.includes('military')
  const isCommercial = type.includes('commercial')
  const isLarge      = isCommercial || info.tower

  if (isMilitary) {
    return {
      has100LL: false,
      hasJetA:  true,
      note: 'Military airports primarily supply Jet-A for military use. Civilian fuel access varies — contact the base ops.',
    }
  }
  if (isCommercial) {
    return {
      has100LL: false,
      hasJetA:  true,
      note: 'Commercial airports typically carry Jet-A. 100LL availability varies — contact the FBO.',
    }
  }
  if (isLarge) {
    return {
      has100LL: true,
      hasJetA:  true,
      note: 'Towered GA airports usually stock both 100LL and Jet-A. Verify with the FBO before arrival.',
    }
  }
  return {
    has100LL: true,
    hasJetA:  false,
    note: 'Small non-towered airports typically carry 100LL. Jet-A is less common — confirm with the FBO.',
  }
}

export default function FuelPrices({ airportCode }: Props) {
  const [open, setOpen]       = useState(false)
  const [info, setInfo]       = useState<AirportInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [fetched, setFetched] = useState(false)

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

  const fuel = info ? getFuelAvailability(info) : null

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
          {/* Fuel pump icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a3a5c" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 22V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
            <path d="M3 10h12" />
            <path d="M15 6l4 4" />
            <path d="M19 10v8a2 2 0 0 1-2 2" />
            <line x1="7" y1="14" x2="7" y2="18" />
            <line x1="3" y1="22" x2="19" y2="22" />
          </svg>
          <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#111827' }}>
            Fuel at {airportCode}
          </span>
          {/* Inline tags once loaded */}
          {fuel && !open && (
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {fuel.has100LL && (
                <span style={fuelTagStyle('#eff6ff', '#bfdbfe', '#1e40af')}>100LL</span>
              )}
              {fuel.hasJetA && (
                <span style={fuelTagStyle('#f0fdf4', '#bbf7d0', '#166534')}>Jet-A</span>
              )}
            </div>
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
              {error} — check <AirNavFuelLink code={airportCode} /> for details.
            </p>
          )}

          {fuel && (
            <div style={{ marginTop: '0.75rem' }}>
              {/* Fuel type badges */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                <FuelBadge
                  label="100LL (AvGas)"
                  available={fuel.has100LL}
                  color="#1e40af"
                  bg="#eff6ff"
                  border="#bfdbfe"
                />
                <FuelBadge
                  label="Jet-A"
                  available={fuel.hasJetA}
                  color="#166534"
                  bg="#f0fdf4"
                  border="#bbf7d0"
                />
              </div>

              {/* Note */}
              <p style={{ margin: '0 0 0.85rem', fontSize: '0.85rem', color: '#374151', lineHeight: 1.6 }}>
                {fuel.note}
              </p>

              {/* AirNav CTA */}
              <a
                href={`https://www.airnav.com/airport/${airportCode}#fuel`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#1a3a5c',
                  color: 'white',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  textDecoration: 'none',
                  marginBottom: '0.85rem',
                }}
              >
                View live fuel prices on AirNav ↗
              </a>

              {/* Disclaimer */}
              <div style={{
                backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: '6px', padding: '0.65rem 0.85rem',
              }}>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
                  ⚠ Fuel type availability is estimated from airport data and may not reflect current FBO inventory.
                  Always verify fuel availability and pricing directly with the FBO before departure.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function fuelTagStyle(bg: string, border: string, text: string): React.CSSProperties {
  return {
    fontSize: '0.7rem', fontWeight: '700',
    padding: '0.15rem 0.5rem', borderRadius: '999px',
    backgroundColor: bg, color: text, border: `1px solid ${border}`,
  }
}

function FuelBadge({ label, available, color, bg, border }: {
  label: string
  available: boolean
  color: string
  bg: string
  border: string
}) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
      padding: '0.4rem 0.85rem', borderRadius: '8px',
      backgroundColor: available ? bg : '#f9fafb',
      border: `1px solid ${available ? border : '#e5e7eb'}`,
    }}>
      <span style={{
        display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
        backgroundColor: available ? color : '#d1d5db',
        flexShrink: 0,
      }} />
      <span style={{
        fontWeight: '700', fontSize: '0.88rem',
        color: available ? color : '#9ca3af',
      }}>
        {label}
      </span>
      <span style={{ fontSize: '0.75rem', color: available ? color : '#9ca3af' }}>
        {available ? 'typically available' : 'not typical'}
      </span>
    </div>
  )
}

function AirNavFuelLink({ code }: { code: string }) {
  return (
    <a
      href={`https://www.airnav.com/airport/${code}#fuel`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}
    >
      AirNav ({code}) ↗
    </a>
  )
}
