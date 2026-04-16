'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { RADIUS_OPTIONS } from '@/lib/geocode'
import type { AirportSuggestion } from './AirportAutocomplete'

const TYPE_COLOR: Record<string, string> = {
  large_airport:  '#6366f1',
  medium_airport: '#0284c7',
  small_airport:  '#16a34a',
  seaplane_base:  '#0891b2',
}
const TYPE_LABEL: Record<string, string> = {
  large_airport:  'Large',
  medium_airport: 'Regional',
  small_airport:  'General Aviation',
  seaplane_base:  'Seaplane',
}

const RUNWAY_OPTIONS = [
  { value: '1000',  label: '1,000+ ft' },
  { value: '2000',  label: '2,000+ ft' },
  { value: '3000',  label: '3,000+ ft' },
  { value: '4000',  label: '4,000+ ft' },
  { value: '5000',  label: '5,000+ ft' },
  { value: '7500',  label: '7,500+ ft' },
  { value: '10000', label: '10,000+ ft' },
]

type SearchFiltersProps = {
  initialQ?: string
  initialType?: string
  initialMinPrice?: string
  initialMaxPrice?: string
  initialMinSqft?: string
  initialRadius?: string
  initialMinRunway?: string
  initialBrokerOnly?: string
}

export default function SearchFilters({
  initialQ = '',
  initialType = '',
  initialMinPrice = '',
  initialMaxPrice = '',
  initialMinSqft = '',
  initialRadius = '',
  initialMinRunway = '',
  initialBrokerOnly = '',
}: SearchFiltersProps) {
  const router = useRouter()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const [locating, setLocating] = useState(false)

  // ── Airport autocomplete state ───────────────────────────────────────────
  const [qValue, setQValue] = useState(initialQ)
  const [suggestions, setSuggestions] = useState<AirportSuggestion[]>([])
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSuggestOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); setSuggestOpen(false); return }
    setSuggestLoading(true)
    try {
      const res = await fetch(`/api/airports/search?q=${encodeURIComponent(q)}&limit=6`)
      const data = await res.json() as AirportSuggestion[]
      setSuggestions(data)
      setSuggestOpen(data.length > 0)
      setActiveIdx(-1)
    } catch {
      setSuggestions([])
      setSuggestOpen(false)
    } finally {
      setSuggestLoading(false)
    }
  }, [])

  function handleQChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setQValue(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 200)
  }

  function handleSuggestionSelect(apt: AirportSuggestion) {
    setQValue(apt.ident)
    setSuggestions([])
    setSuggestOpen(false)
    router.push(`/?q=${encodeURIComponent(apt.ident)}`, { scroll: false })
  }

  function handleQKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!suggestOpen) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); handleSuggestionSelect(suggestions[activeIdx]) }
    else if (e.key === 'Escape') setSuggestOpen(false)
  }

  async function handleNearMe() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://avwx.rest/api/station/near/${coords.latitude},${coords.longitude}?n=1&airport=true`,
            { headers: { Authorization: `TOKEN ${process.env.NEXT_PUBLIC_AVWX_TOKEN ?? ''}` } }
          ).catch(() => null)

          let code = ''
          if (res?.ok) {
            const json = await res.json()
            code = json?.[0]?.station?.icao ?? ''
          }

          if (!code) {
            const geo = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`
            ).then(r => r.json()).catch(() => null)
            code = geo?.address?.city ?? geo?.address?.town ?? geo?.address?.county ?? ''
          }

          if (code) {
            setQValue(code)
            router.push(`/?q=${encodeURIComponent(code)}`, { scroll: false })
          }
        } finally {
          setLocating(false)
        }
      },
      () => setLocating(false),
      { timeout: 8000 }
    )
  }

  // Count active filters (excluding the main search query)
  const activeFilterCount = [initialType, initialMinPrice, initialMaxPrice, initialMinSqft, initialRadius, initialMinRunway, initialBrokerOnly]
    .filter(Boolean).length

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSuggestOpen(false)
    const data = new FormData(e.currentTarget)
    const params = new URLSearchParams()

    const q          = qValue.trim()
    const type       = data.get('type') as string
    const minPrice   = (data.get('minPrice') as string)?.trim()
    const maxPrice   = (data.get('maxPrice') as string)?.trim()
    const minSqft    = (data.get('minSqft') as string)?.trim()
    const radius     = data.get('radius') as string
    const minRunway  = data.get('minRunway') as string
    const brokerOnly = data.get('brokerOnly') as string

    if (q)          params.set('q', q)
    if (type)       params.set('type', type)
    if (minPrice)   params.set('minPrice', minPrice)
    if (maxPrice)   params.set('maxPrice', maxPrice)
    if (minSqft)    params.set('minSqft', minSqft)
    if (radius && q) params.set('radius', radius)
    if (minRunway)  params.set('minRunway', minRunway)
    if (brokerOnly) params.set('brokerOnly', '1')

    const qs = params.toString()
    router.push(qs ? `/?${qs}` : '/', { scroll: false })
    setFiltersOpen(false)
  }

  function handleClear() {
    if (formRef.current) formRef.current.reset()
    setQValue('')
    setSuggestions([])
    setSuggestOpen(false)
    router.push('/', { scroll: false })
    setFiltersOpen(false)
  }

  const hasAnyFilter = Boolean(initialQ || initialType || initialMinPrice || initialMaxPrice || initialMinSqft || initialRadius || initialMinRunway || initialBrokerOnly)

  return (
    <form ref={formRef} onSubmit={handleSubmit} style={wrapperStyle}>

      {/* ── Row 1: Search input (full-width on mobile) ─────────────────── */}
      <div className="sf-top-row">
        {/* Airport autocomplete wrapper */}
        <div ref={containerRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <input
            name="q"
            type="text"
            value={qValue}
            onChange={handleQChange}
            onKeyDown={handleQKeyDown}
            onFocus={() => suggestions.length > 0 && setSuggestOpen(true)}
            placeholder="City, state, or airport code..."
            className="sf-search-input"
            autoComplete="off"
            style={{ ...inputStyle, width: '100%', paddingRight: suggestLoading ? '2.2rem' : undefined }}
          />
          {suggestLoading && (
            <span style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af"
                strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            </span>
          )}
          {suggestOpen && suggestions.length > 0 && (
            <ul style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
              backgroundColor: 'white', border: '1px solid #e5e7eb',
              borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.13)',
              zIndex: 2000, margin: 0, padding: '6px 0', listStyle: 'none',
              maxHeight: '320px', overflowY: 'auto',
            }}>
              {suggestions.map((apt, i) => {
                const color = TYPE_COLOR[apt.type] ?? '#6b7280'
                const location = [apt.municipality, apt.iso_region?.replace('US-', '')].filter(Boolean).join(', ')
                return (
                  <li
                    key={apt.id}
                    onMouseDown={() => handleSuggestionSelect(apt)}
                    onMouseEnter={() => setActiveIdx(i)}
                    style={{
                      padding: '0.65rem 1rem', cursor: 'pointer',
                      backgroundColor: i === activeIdx ? '#f5f3ff' : 'transparent',
                      borderLeft: i === activeIdx ? '3px solid #6366f1' : '3px solid transparent',
                    }}
                  >
                    <div style={{ fontSize: '0.88rem', fontWeight: '600', color: '#111827', marginBottom: '0.2rem' }}>
                      {apt.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <span style={{
                        fontFamily: 'monospace', fontWeight: '700', fontSize: '0.73rem',
                        color: color, backgroundColor: `${color}15`,
                        padding: '0.1rem 0.4rem', borderRadius: '4px',
                      }}>{apt.ident}</span>
                      {location && <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>· {location}</span>}
                      <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontStyle: 'italic' }}>
                        · {TYPE_LABEL[apt.type] ?? apt.type}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Near me button */}
        <button
          type="button"
          onClick={handleNearMe}
          disabled={locating}
          title="Find hangars near me"
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '38px',
            height: '40px',
            backgroundColor: locating ? '#e5e7eb' : 'white',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            cursor: locating ? 'default' : 'pointer',
            color: locating ? '#9ca3af' : '#374151',
          }}
        >
          {locating ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
              <circle cx="12" cy="12" r="8" strokeDasharray="3 3"/>
            </svg>
          )}
        </button>

        {/* Action group — sits inline on desktop, wraps to new line on mobile */}
        <div className="sf-action-group">
          {/* Filters toggle — shows on mobile only (CSS) */}
          <button
            type="button"
            className="sf-filters-btn"
            onClick={() => setFiltersOpen(o => !o)}
            aria-expanded={filtersOpen}
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span style={filterBadgeStyle}>{activeFilterCount}</span>
            )}
          </button>

          <button type="submit" style={searchButtonStyle}>
            Search
          </button>

          {hasAnyFilter && (
            <button type="button" onClick={handleClear} style={clearButtonStyle}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Row 2: Extra filters — always visible desktop, animated on mobile ── */}
      <div
        className={filtersOpen ? 'sf-extra-filters sf-extra-filters--open' : 'sf-extra-filters'}
      >
        {/* Listing type */}
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Listing Type</label>
          <select name="type" defaultValue={initialType} style={selectStyle}>
            <option value="">All types</option>
            <option value="sale">For Sale</option>
            <option value="lease">For Lease</option>
            <option value="space">Space Available</option>
          </select>
        </div>

        {/* Min price */}
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Min Price ($)</label>
          <input
            name="minPrice"
            type="number"
            defaultValue={initialMinPrice}
            placeholder="0"
            min="0"
            style={inputStyle}
          />
        </div>

        {/* Max price */}
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Max Price ($)</label>
          <input
            name="maxPrice"
            type="number"
            defaultValue={initialMaxPrice}
            placeholder="Any"
            min="0"
            style={inputStyle}
          />
        </div>

        {/* Min sq ft */}
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Min Sq Ft</label>
          <input
            name="minSqft"
            type="number"
            defaultValue={initialMinSqft}
            placeholder="Any"
            min="0"
            style={inputStyle}
          />
        </div>

        {/* Min runway length */}
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Min Runway</label>
          <select name="minRunway" defaultValue={initialMinRunway} style={selectStyle}>
            <option value="">Any length</option>
            {RUNWAY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Radius */}
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Search Radius</label>
          <select name="radius" defaultValue={initialRadius} style={selectStyle}>
            <option value="">Any distance</option>
            {RADIUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Broker-only listings — compact inline toggle */}
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '1px' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '0.45rem',
            cursor: 'pointer', whiteSpace: 'nowrap',
            padding: '0 0.75rem',
            height: '40px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            backgroundColor: '#f9fafb',
            fontSize: '0.8rem',
            fontWeight: '600',
            color: '#374151',
          }}>
            <input
              type="checkbox"
              name="brokerOnly"
              value="1"
              defaultChecked={initialBrokerOnly === '1'}
              style={{ width: '14px', height: '14px', accentColor: '#1a3a5c', cursor: 'pointer', flexShrink: 0 }}
            />
            Broker listings only
          </label>
        </div>

        {/* Mobile-only: Apply button inside the filter panel */}
        <button type="submit" className="sf-apply-btn" style={applyButtonStyle}>
          Apply Filters
        </button>
      </div>
    </form>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────

const wrapperStyle: React.CSSProperties = {
  backgroundColor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '0.85rem 1.25rem',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
}

const inputStyle: React.CSSProperties = {
  padding: '0.55rem 0.85rem',
  height: '40px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.9rem',
  color: '#111827',
  backgroundColor: '#f9fafb',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'Arial, sans-serif',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'auto',
  cursor: 'pointer',
}

const fieldGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
  minWidth: '130px',
  flex: '1',
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  fontWeight: '700',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const searchButtonStyle: React.CSSProperties = {
  padding: '0 1.25rem',
  height: '40px',
  backgroundColor: '#111827',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '0.875rem',
  fontWeight: '600',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  fontFamily: 'Arial, sans-serif',
}

const clearButtonStyle: React.CSSProperties = {
  padding: '0 0.85rem',
  height: '40px',
  backgroundColor: 'white',
  color: '#6b7280',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.875rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  fontFamily: 'Arial, sans-serif',
}

const filterBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '18px',
  height: '18px',
  borderRadius: '50%',
  backgroundColor: '#1a3a5c',
  color: 'white',
  fontSize: '0.65rem',
  fontWeight: '700',
  lineHeight: 1,
}

const applyButtonStyle: React.CSSProperties = {
  padding: '0 1.25rem',
  height: '40px',
  backgroundColor: '#1a3a5c',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '0.875rem',
  fontWeight: '600',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  alignSelf: 'flex-end',
  fontFamily: 'Arial, sans-serif',
}
