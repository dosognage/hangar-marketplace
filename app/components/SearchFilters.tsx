'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type SearchFiltersProps = {
  initialQ?: string
  initialType?: string
  initialMinPrice?: string
  initialMaxPrice?: string
  initialMinSqft?: string
}

export default function SearchFilters({
  initialQ = '',
  initialType = '',
  initialMinPrice = '',
  initialMaxPrice = '',
  initialMinSqft = '',
}: SearchFiltersProps) {
  const router = useRouter()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  // Count active filters (excluding the main search query)
  const activeFilterCount = [initialType, initialMinPrice, initialMaxPrice, initialMinSqft]
    .filter(Boolean).length

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const params = new URLSearchParams()

    const q        = (data.get('q') as string)?.trim()
    const type     = data.get('type') as string
    const minPrice = (data.get('minPrice') as string)?.trim()
    const maxPrice = (data.get('maxPrice') as string)?.trim()
    const minSqft  = (data.get('minSqft') as string)?.trim()

    if (q)        params.set('q', q)
    if (type)     params.set('type', type)
    if (minPrice) params.set('minPrice', minPrice)
    if (maxPrice) params.set('maxPrice', maxPrice)
    if (minSqft)  params.set('minSqft', minSqft)

    const qs = params.toString()
    router.push(qs ? `/?${qs}` : '/', { scroll: false })
    setFiltersOpen(false)
  }

  function handleClear() {
    // Reset all inputs manually so controlled defaults are cleared
    if (formRef.current) formRef.current.reset()
    router.push('/', { scroll: false })
    setFiltersOpen(false)
  }

  const hasAnyFilter = Boolean(initialQ || initialType || initialMinPrice || initialMaxPrice || initialMinSqft)

  return (
    <form ref={formRef} onSubmit={handleSubmit} style={wrapperStyle}>

      {/* ── Row 1: Search input (full-width on mobile) ─────────────────── */}
      <div className="sf-top-row">
        <input
          name="q"
          type="search"
          defaultValue={initialQ}
          placeholder="City, state, or airport code..."
          className="sf-search-input"
          style={inputStyle}
        />

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
