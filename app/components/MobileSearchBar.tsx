'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  initialQ?: string
  initialType?: string
  initialMinPrice?: string
  initialMaxPrice?: string
  initialMinSqft?: string
}

export default function MobileSearchBar({
  initialQ = '',
  initialType = '',
  initialMinPrice = '',
  initialMaxPrice = '',
  initialMinSqft = '',
}: Props) {
  const router = useRouter()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const activeCount = [initialType, initialMinPrice, initialMaxPrice, initialMinSqft]
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
    if (formRef.current) formRef.current.reset()
    router.push('/', { scroll: false })
    setFiltersOpen(false)
  }

  const hasActiveFilters = Boolean(initialType || initialMinPrice || initialMaxPrice || initialMinSqft)

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '12px',
      right: '12px',
      zIndex: 1001,
    }}>
      <form ref={formRef} onSubmit={handleSubmit}>

        {/* ── Large pill search row ─────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'white',
          borderRadius: '32px',
          boxShadow: '0 2px 24px rgba(0,0,0,0.3)',
          padding: '0 8px 0 16px',
          height: '54px',
          gap: '6px',
        }}>
          {/* Search icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>

          <input
            name="q"
            type="search"
            defaultValue={initialQ}
            placeholder="City, state, or airport code..."
            autoComplete="off"
            style={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              outline: 'none',
              fontSize: '16px',
              color: '#111827',
              backgroundColor: 'transparent',
              fontFamily: 'system-ui, Arial, sans-serif',
            }}
          />

          {/* Search submit */}
          <button
            type="submit"
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '40px',
              padding: '0 14px',
              backgroundColor: '#111827',
              color: 'white',
              border: 'none',
              borderRadius: '24px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              fontFamily: 'system-ui, Arial, sans-serif',
            }}
          >
            Go
          </button>

          {/* Divider */}
          <div style={{ width: '1px', height: '24px', backgroundColor: '#e5e7eb', flexShrink: 0 }} />

          {/* Filters icon button */}
          <button
            type="button"
            onClick={() => setFiltersOpen(o => !o)}
            aria-label="Toggle filters"
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: filtersOpen || activeCount > 0 ? '#1a3a5c' : '#f3f4f6',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={filtersOpen || activeCount > 0 ? 'white' : '#374151'}
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
              <line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            {activeCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '1px',
                right: '1px',
                width: '15px',
                height: '15px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                color: 'white',
                fontSize: '9px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                border: '1.5px solid white',
              }}>
                {activeCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Filter drawer ─────────────────────────────────────────────── */}
        {filtersOpen && (
          <div style={{
            marginTop: '10px',
            backgroundColor: 'white',
            borderRadius: '20px',
            boxShadow: '0 6px 32px rgba(0,0,0,0.22)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}>
            {/* Listing type */}
            <div>
              <label style={labelStyle}>Listing Type</label>
              <select name="type" defaultValue={initialType} style={fieldStyle}>
                <option value="">All types</option>
                <option value="sale">For Sale</option>
                <option value="lease">For Lease</option>
                <option value="space">Space Available</option>
              </select>
            </div>

            {/* Price row */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Min Price ($)</label>
                <input name="minPrice" type="number" defaultValue={initialMinPrice}
                  placeholder="0" min="0" style={fieldStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Max Price ($)</label>
                <input name="maxPrice" type="number" defaultValue={initialMaxPrice}
                  placeholder="Any" min="0" style={fieldStyle} />
              </div>
            </div>

            {/* Min sq ft */}
            <div>
              <label style={labelStyle}>Min Sq Ft</label>
              <input name="minSqft" type="number" defaultValue={initialMinSqft}
                placeholder="Any" min="0" style={fieldStyle} />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', paddingTop: '2px' }}>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClear}
                  style={{
                    flex: 1,
                    height: '46px',
                    backgroundColor: 'white',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontFamily: 'system-ui, Arial, sans-serif',
                  }}
                >
                  Clear all
                </button>
              )}
              <button
                type="submit"
                style={{
                  flex: 2,
                  height: '46px',
                  backgroundColor: '#1a3a5c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontFamily: 'system-ui, Arial, sans-serif',
                }}
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

// ── Shared field styles ────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: '700',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '6px',
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  height: '44px',
  padding: '0 12px',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  fontSize: '15px',
  color: '#111827',
  backgroundColor: '#f9fafb',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'system-ui, Arial, sans-serif',
  appearance: 'auto',
}
