'use client'

import { useState } from 'react'
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

  // Count active filters (excluding the main search query)
  const activeFilterCount = [initialType, initialMinPrice, initialMaxPrice, initialMinSqft]
    .filter(Boolean).length

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const params = new URLSearchParams()

    const q         = (data.get('q') as string)?.trim()
    const type      = data.get('type') as string
    const minPrice  = (data.get('minPrice') as string)?.trim()
    const maxPrice  = (data.get('maxPrice') as string)?.trim()
    const minSqft   = (data.get('minSqft') as string)?.trim()

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
    router.push('/', { scroll: false })
    setFiltersOpen(false)
  }

  return (
    <form onSubmit={handleSubmit} style={wrapperStyle}>
      {/* ── Top row: always visible ─────────────────────────────────────── */}
      <div style={topRowStyle}>
        {/* Location search */}
        <input
          name="q"
          type="text"
          defaultValue={initialQ}
          placeholder="City, state, or airport code..."
          style={{ ...inputStyle, flex: 1, minWidth: 0 }}
        />

        {/* Filters toggle — only visible on mobile via CSS */}
        <button
          type="button"
          className="filters-toggle-btn"
          onClick={() => setFiltersOpen(o => !o)}
          style={filtersToggleStyle}
        >
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>

        {/* Search button */}
        <button type="submit" style={searchButtonStyle}>
          Search
        </button>
        <button type="button" onClick={handleClear} style={clearButtonStyle}>
          Clear
        </button>
      </div>

      {/* ── Extra filters row: always visible on desktop, toggleable on mobile ── */}
      <div
        className={filtersOpen ? 'extra-filters extra-filters--open' : 'extra-filters'}
        style={extraFiltersStyle}
      >
        {/* Listing type */}
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Listing Type</label>
          <select name="type" defaultValue={initialType} style={inputStyle}>
            <option value="">All types</option>
            <option value="sale">For Sale</option>
            <option value="lease">For Lease</option>
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

const topRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  flexWrap: 'nowrap',
}

const extraFiltersStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
  alignItems: 'flex-end',
}

const fieldGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  minWidth: '130px',
  flex: '1',
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: '600',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  height: '38px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.875rem',
  color: '#111827',
  backgroundColor: '#f9fafb',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  appearance: 'auto',
}

const searchButtonStyle: React.CSSProperties = {
  padding: '0.55rem 1.25rem',
  backgroundColor: '#111827',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '0.875rem',
  fontWeight: '600',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flexShrink: 0,
}

const clearButtonStyle: React.CSSProperties = {
  padding: '0.55rem 0.75rem',
  backgroundColor: 'white',
  color: '#6b7280',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.875rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flexShrink: 0,
}

const filtersToggleStyle: React.CSSProperties = {
  padding: '0.55rem 0.9rem',
  backgroundColor: 'white',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flexShrink: 0,
}
