'use client'

/**
 * AircraftFitCalculator
 *
 * Lets the user enter their aircraft dimensions and check whether
 * it will fit in the hangar based on the listing's door and depth specs.
 */

import { useState } from 'react'
import AircraftAutocomplete from './AircraftAutocomplete'
import type { AircraftSpec } from '@/lib/aircraft-data'

type Props = {
  doorWidth: number | null
  doorHeight: number | null
  hangarDepth: number | null
}

type Result = 'pass' | 'fail' | 'unknown'

function check(aircraft: number, hangar: number | null): Result {
  if (hangar == null) return 'unknown'
  return aircraft <= hangar ? 'pass' : 'fail'
}

export default function AircraftFitCalculator({ doorWidth, doorHeight, hangarDepth }: Props) {
  const [open, setOpen] = useState(false)
  const [aircraftName, setAircraftName] = useState('')
  const [autoFilled, setAutoFilled] = useState(false)
  const [wingspan, setWingspan] = useState('')
  const [tailHeight, setTailHeight] = useState('')
  const [length, setLength] = useState('')
  const [checked, setChecked] = useState(false)

  function handleAircraftSelect(spec: AircraftSpec) {
    setAircraftName(spec.name)
    setWingspan(String(spec.wingspan_ft))
    setTailHeight(String(spec.height_ft))
    setLength(String(spec.length_ft))
    setAutoFilled(true)
    setChecked(false)
  }

  function handleAircraftClear() {
    setAircraftName('')
    setAutoFilled(false)
    setWingspan('')
    setTailHeight('')
    setLength('')
    setChecked(false)
  }

  const ws = parseFloat(wingspan)
  const th = parseFloat(tailHeight)
  const len = parseFloat(length)

  const wingResult   = checked && !isNaN(ws)  ? check(ws, doorWidth)   : null
  const heightResult = checked && !isNaN(th)  ? check(th, doorHeight)  : null
  const depthResult  = checked && !isNaN(len) ? check(len, hangarDepth) : null

  const anyFail = wingResult === 'fail' || heightResult === 'fail' || depthResult === 'fail'
  const allPass = checked && (wingResult === 'pass' || wingResult === 'unknown')
                          && (heightResult === 'pass' || heightResult === 'unknown')
                          && (depthResult === 'pass' || depthResult === 'unknown')
                          && (wingResult === 'pass' || heightResult === 'pass' || depthResult === 'pass')

  function handleCheck() {
    if (!wingspan && !tailHeight && !length) return
    setChecked(true)
  }

  function handleReset() {
    setAircraftName('')
    setAutoFilled(false)
    setWingspan('')
    setTailHeight('')
    setLength('')
    setChecked(false)
  }

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '10px',
      marginBottom: '1.5rem',
      overflow: 'hidden',
    }}>
      {/* Header — always visible */}
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
          {/* Plane icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a3a5c" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
          <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#111827' }}>
            Will my aircraft fit?
          </span>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expandable body */}
      {open && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid #f3f4f6' }}>
          <p style={{ margin: '0.75rem 0 1rem', fontSize: '0.82rem', color: '#6b7280' }}>
            Search your aircraft type to auto-fill dimensions, or enter them manually below.
          </p>

          {/* Aircraft type autocomplete */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>
              Aircraft type
            </label>
            {autoFilled ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.4rem 0.75rem',
                backgroundColor: '#f0fdf4', border: '1px solid #86efac',
                borderRadius: '6px', fontSize: '0.82rem',
              }}>
                <span style={{ color: '#16a34a', fontWeight: '600' }}>✓ {aircraftName} — dimensions auto-filled</span>
                <button
                  onClick={handleAircraftClear}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#6b7280', padding: '0', fontSize: '0.85rem', lineHeight: 1,
                  }}
                  aria-label="Clear aircraft"
                >✕</button>
              </div>
            ) : (
              <AircraftAutocomplete
                value={aircraftName}
                onChange={(v) => {
                  setAircraftName(v)
                  // If user clears the name manually, reset autoFilled state
                  if (!v) { setAutoFilled(false) }
                }}
                onSelect={handleAircraftSelect}
                inputStyle={{
                  width: '100%',
                  padding: '0.45rem 0.6rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  color: '#111827',
                  backgroundColor: 'white',
                  boxSizing: 'border-box' as const,
                }}
              />
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
            <InputField
              label="Wingspan (ft)"
              value={wingspan}
              onChange={v => { setWingspan(v); setChecked(false) }}
              placeholder="e.g. 36"
              limit={doorWidth}
              limitLabel="door width"
            />
            <InputField
              label="Tail height (ft)"
              value={tailHeight}
              onChange={v => { setTailHeight(v); setChecked(false) }}
              placeholder="e.g. 9"
              limit={doorHeight}
              limitLabel="door height"
            />
            <InputField
              label="Aircraft length (ft)"
              value={length}
              onChange={v => { setLength(v); setChecked(false) }}
              placeholder="e.g. 28"
              limit={hangarDepth}
              limitLabel="hangar depth"
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleCheck}
              disabled={!wingspan && !tailHeight && !length}
              style={{
                padding: '0.5rem 1.25rem',
                backgroundColor: '#1a3a5c',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: (!wingspan && !tailHeight && !length) ? 'default' : 'pointer',
                opacity: (!wingspan && !tailHeight && !length) ? 0.5 : 1,
              }}
            >
              Check fit
            </button>
            {checked && (
              <button onClick={handleReset} style={{
                padding: '0.5rem 0.75rem',
                background: 'none',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: '#6b7280',
                cursor: 'pointer',
              }}>
                Reset
              </button>
            )}
          </div>

          {/* Results */}
          {checked && (
            <div style={{
              marginTop: '1rem',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              backgroundColor: anyFail ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${anyFail ? '#fecaca' : '#bbf7d0'}`,
            }}>
              <p style={{ margin: '0 0 0.6rem', fontWeight: '700', fontSize: '0.9rem', color: anyFail ? '#dc2626' : '#16a34a' }}>
                {anyFail ? '✗ Does not fit' : allPass ? '✓ Fits!' : '⚠ Partially fits — verify dimensions with seller'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {wingspan && <ResultRow label="Wingspan" aircraft={ws} hangar={doorWidth} result={wingResult} unit="ft door width" />}
                {tailHeight && <ResultRow label="Tail height" aircraft={th} hangar={doorHeight} result={heightResult} unit="ft door height" />}
                {length && <ResultRow label="Length" aircraft={len} hangar={hangarDepth} result={depthResult} unit="ft depth" />}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InputField({ label, value, onChange, placeholder, limit, limitLabel }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  limit: number | null
  limitLabel: string
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>
        {label}
      </label>
      <input
        type="number"
        min="0"
        step="0.1"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '0.45rem 0.6rem',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '0.875rem',
          color: '#111827',
          backgroundColor: 'white',
          boxSizing: 'border-box',
        }}
      />
      {limit != null && (
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: '#9ca3af' }}>
          Hangar: {limit}′ {limitLabel}
        </p>
      )}
      {limit == null && (
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: '#9ca3af' }}>
          Not listed
        </p>
      )}
    </div>
  )
}

function ResultRow({ label, aircraft, hangar, result, unit }: {
  label: string
  aircraft: number
  hangar: number | null
  result: Result | null
  unit: string
}) {
  const icon = result === 'pass' ? '✓' : result === 'fail' ? '✗' : '?'
  const color = result === 'pass' ? '#16a34a' : result === 'fail' ? '#dc2626' : '#92400e'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
      <span style={{ fontWeight: '700', color, width: '14px' }}>{icon}</span>
      <span style={{ color: '#374151', minWidth: '90px' }}>{label}:</span>
      <span style={{ color: '#111827' }}>
        Your {aircraft}′ vs {hangar != null ? `${hangar}′ ${unit}` : 'not listed'}
      </span>
    </div>
  )
}
