'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { searchAircraft, type AircraftSpec } from '@/lib/aircraft-data'

interface Props {
  value: string
  onChange: (value: string) => void
  onSelect: (spec: AircraftSpec) => void
  inputStyle?: React.CSSProperties
}

export default function AircraftAutocomplete({ value, onChange, onSelect, inputStyle }: Props) {
  const [results, setResults] = useState<AircraftSpec[]>([])
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [selectedSpec, setSelectedSpec] = useState<AircraftSpec | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Run search whenever the typed value changes
  useEffect(() => {
    if (selectedSpec && value === selectedSpec.name) {
      // User hasn't changed anything since a selection — don't re-open
      setResults([])
      setOpen(false)
      return
    }
    const hits = searchAircraft(value)
    setResults(hits)
    setOpen(hits.length > 0)
    setActiveIdx(-1)
  }, [value, selectedSpec])

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleSelect = useCallback((spec: AircraftSpec) => {
    setSelectedSpec(spec)
    onChange(spec.name)
    onSelect(spec)
    setOpen(false)
    setResults([])
    inputRef.current?.blur()
  }, [onChange, onSelect])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      handleSelect(results[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Clear the locked-in spec so the dropdown re-opens
    setSelectedSpec(null)
    onChange(e.target.value)
  }

  const categoryLabel: Record<AircraftSpec['category'], string> = {
    'piston-single': 'Piston Single',
    'piston-twin': 'Piston Twin',
    'turboprop': 'Turboprop',
    'light-jet': 'Light Jet',
    'midsize-jet': 'Midsize Jet',
    'large-jet': 'Large Jet',
    'warbird': 'Warbird',
    'helicopter': 'Helicopter',
    'other': 'Other',
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        name="aircraft_type"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (results.length > 0) setOpen(true)
        }}
        placeholder="Cessna 172, Pilatus PC-12, King Air 350…"
        autoComplete="off"
        style={inputStyle}
      />

      {/* Autofilled badge */}
      {selectedSpec && (
        <div style={{
          marginTop: '0.3rem',
          fontSize: '0.75rem',
          color: '#059669',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
        }}>
          <span>✓</span>
          <span>
            Dimensions auto-filled — wingspan {selectedSpec.wingspan_ft} ft,
            length {selectedSpec.length_ft} ft,
            height {selectedSpec.height_ft} ft
          </span>
          <button
            type="button"
            onClick={() => { setSelectedSpec(null); onChange('') }}
            style={{
              marginLeft: '0.2rem', background: 'none', border: 'none',
              cursor: 'pointer', color: '#9ca3af', fontSize: '0.75rem',
              padding: '0', lineHeight: 1,
            }}
            title="Clear selection"
          >
            ✕
          </button>
        </div>
      )}

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          zIndex: 50,
          backgroundColor: 'white',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          marginTop: '2px',
          overflow: 'hidden',
          maxHeight: '280px',
          overflowY: 'auto',
        }}>
          {results.map((spec, i) => (
            <button
              key={spec.name}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault() // prevent input blur before click
                handleSelect(spec)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '0.6rem 0.85rem',
                border: 'none',
                borderBottom: i < results.length - 1 ? '1px solid #f3f4f6' : 'none',
                backgroundColor: i === activeIdx ? '#f5f3ff' : 'white',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.1s',
              }}
              onMouseEnter={() => setActiveIdx(i)}
            >
              {/* Left: name + category */}
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                  {spec.name}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.1rem' }}>
                  {categoryLabel[spec.category]}
                </div>
              </div>

              {/* Right: key dimensions */}
              <div style={{
                fontSize: '0.72rem', color: '#6b7280',
                textAlign: 'right', lineHeight: 1.6, flexShrink: 0, marginLeft: '1rem',
              }}>
                <div>WS: <strong style={{ color: '#374151' }}>{spec.wingspan_ft} ft</strong></div>
                <div>HT: <strong style={{ color: '#374151' }}>{spec.height_ft} ft</strong></div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
