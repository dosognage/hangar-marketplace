'use client'

import { useEffect, useState } from 'react'
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

type Props = {
  query: string
}

export default function NoResultsSuggestions({ query }: Props) {
  const [suggestions, setSuggestions] = useState<AirportSuggestion[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query || query.length < 2) return
    setLoading(true)
    fetch(`/api/airports/search?q=${encodeURIComponent(query)}&limit=5`)
      .then(r => r.json())
      .then((data: AirportSuggestion[]) => setSuggestions(data))
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false))
  }, [query])

  return (
    <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
      {/* Icon */}
      <div style={{ marginBottom: '0.75rem' }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#d1d5db"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </div>

      <p style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', margin: '0 0 0.4rem' }}>
        No hangars found
        {query && <span style={{ color: '#6b7280', fontWeight: '400' }}> for &ldquo;{query}&rdquo;</span>}
      </p>

      {/* Did you mean suggestions */}
      {!loading && suggestions.length > 0 && (
        <div style={{ marginTop: '1.5rem', textAlign: 'left', maxWidth: '380px', margin: '1.5rem auto 0' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase',
            letterSpacing: '0.05em', marginBottom: '0.65rem', textAlign: 'center' }}>
            Did you mean one of these airports?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {suggestions.map(apt => {
              const color = TYPE_COLOR[apt.type] ?? '#6b7280'
              const state = apt.iso_region?.replace('US-', '') ?? ''
              const location = [apt.municipality, state].filter(Boolean).join(', ')
              return (
                <a
                  key={apt.id}
                  href={`/?q=${encodeURIComponent(apt.ident)}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'white', border: '1px solid #e5e7eb',
                    borderRadius: '10px', textDecoration: 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  className="no-results-suggestion"
                >
                  {/* Code badge */}
                  <span style={{
                    flexShrink: 0, fontFamily: 'monospace', fontWeight: '700',
                    fontSize: '0.8rem', color, backgroundColor: `${color}15`,
                    padding: '0.25rem 0.55rem', borderRadius: '5px', minWidth: '44px',
                    textAlign: 'center', letterSpacing: '0.03em',
                  }}>
                    {apt.ident}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {apt.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.1rem' }}>
                      {location} · <span style={{ fontStyle: 'italic' }}>{TYPE_LABEL[apt.type] ?? apt.type}</span>
                    </div>
                  </div>

                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* Fallback when no airport suggestions either */}
      {!loading && suggestions.length === 0 && query && (
        <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0.5rem 0 1.25rem' }}>
          Try a different search or clear the filters.
        </p>
      )}

      <a href="/" style={{
        display: 'inline-block', marginTop: '1.25rem',
        padding: '0.55rem 1.25rem', backgroundColor: '#111827',
        color: 'white', borderRadius: '8px', textDecoration: 'none',
        fontWeight: '600', fontSize: '0.875rem',
      }}>
        Clear all filters
      </a>
    </div>
  )
}
