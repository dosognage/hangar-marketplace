'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

export type AirportSuggestion = {
  id: number
  ident: string
  name: string
  type: string
  municipality: string | null
  iso_region: string | null
  latitude_deg: number
  longitude_deg: number
  gps_code: string | null
  local_code: string | null
}

type Props = {
  /** Current value of the airport name input */
  value: string
  onChange: (value: string) => void
  /** Called when user picks a suggestion — supplies full airport record */
  onSelect: (airport: AirportSuggestion) => void
  placeholder?: string
  required?: boolean
  inputStyle?: React.CSSProperties
  /** HTML name attribute, useful for form libraries and E2E test selectors */
  name?: string
}

const TYPE_LABEL: Record<string, string> = {
  large_airport:  'Large',
  medium_airport: 'Regional',
  small_airport:  'General Aviation',
  seaplane_base:  'Seaplane',
}

const TYPE_COLOR: Record<string, string> = {
  large_airport:  '#6366f1',
  medium_airport: '#0284c7',
  small_airport:  '#16a34a',
  seaplane_base:  '#0891b2',
}

/** Derives the 2-letter state abbreviation from "US-WA" → "WA" */
const stateAbbr = (region: string | null) =>
  region ? region.replace('US-', '') : ''

export default function AirportAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Paine Field',
  required = false,
  inputStyle = {},
  name,
}: Props) {
  const [suggestions, setSuggestions]   = useState<AirportSuggestion[]>([])
  const [open, setOpen]                  = useState(false)
  const [loading, setLoading]            = useState(false)
  const [activeIdx, setActiveIdx]        = useState(-1)
  const debounceRef                      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef                     = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); setOpen(false); return }
    setLoading(true)
    try {
      const res  = await fetch(`/api/airports/search?q=${encodeURIComponent(q)}&limit=8`)
      const data = await res.json() as AirportSuggestion[]
      setSuggestions(data)
      setOpen(data.length > 0)
      setActiveIdx(-1)
    } catch {
      setSuggestions([])
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }, [])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    onChange(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(v), 200)
  }

  function handleSelect(airport: AirportSuggestion) {
    onChange(airport.name)
    setSuggestions([])
    setOpen(false)
    onSelect(airport)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      handleSelect(suggestions[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          name={name}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          style={{ ...inputStyle, paddingRight: loading ? '2.2rem' : undefined }}
        />
        {loading && (
          <span style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round"
              style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          </span>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          backgroundColor: 'white', border: '1px solid #e5e7eb',
          borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.13)',
          zIndex: 1000, margin: 0, padding: '6px 0', listStyle: 'none',
          maxHeight: '340px', overflowY: 'auto',
        }}>
          {suggestions.map((apt, i) => {
            const code      = apt.ident
            const city      = apt.municipality
            const state     = stateAbbr(apt.iso_region)
            const typeLabel = TYPE_LABEL[apt.type] ?? apt.type
            const typeColor = TYPE_COLOR[apt.type] ?? '#6b7280'
            const location  = [city, state].filter(Boolean).join(', ')
            const isActive  = i === activeIdx

            return (
              <li
                key={apt.id}
                onMouseDown={() => handleSelect(apt)}
                onMouseEnter={() => setActiveIdx(i)}
                style={{
                  padding: '0.7rem 1rem',
                  cursor: 'pointer',
                  backgroundColor: isActive ? '#f5f3ff' : 'transparent',
                  borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                  transition: 'background-color 0.1s',
                }}
              >
                {/* Line 1: airport name */}
                <div style={{
                  fontSize: '0.9rem', fontWeight: '600', color: '#111827',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  marginBottom: '0.25rem',
                }}>
                  {apt.name}
                </div>

                {/* Line 2: code badge · location · type — all muted, no competing colors */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  flexWrap: 'wrap',
                }}>
                  <span style={{
                    fontFamily: 'monospace', fontWeight: '700', fontSize: '0.75rem',
                    color: typeColor, backgroundColor: `${typeColor}15`,
                    padding: '0.1rem 0.45rem', borderRadius: '4px',
                    letterSpacing: '0.03em',
                  }}>
                    {code}
                  </span>
                  {location && (
                    <>
                      <span style={{ color: '#d1d5db', fontSize: '0.7rem' }}>·</span>
                      <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                        {location}
                      </span>
                    </>
                  )}
                  <span style={{ color: '#d1d5db', fontSize: '0.7rem' }}>·</span>
                  <span style={{ fontSize: '0.72rem', color: '#9ca3af', fontStyle: 'italic' }}>
                    {typeLabel}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
