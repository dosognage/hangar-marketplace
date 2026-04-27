'use client'

import { useState, useMemo, useTransition } from 'react'
import { saveDefaultAircraft, type AircraftSpec } from '@/app/actions/aircraft'

/**
 * Settings widget where the user picks their primary aircraft. Drives the
 * "Fits my [aircraft]" pill on the homepage and any listing-detail fit
 * widgets we add later.
 */
export default function AircraftSelector({
  aircraft,
  currentId,
}: {
  aircraft:  AircraftSpec[]
  currentId: string | null
}) {
  const [selected, setSelected]      = useState<string>(currentId ?? '')
  const [search, setSearch]          = useState('')
  const [isPending, startTransition] = useTransition()
  const [status, setStatus]          = useState<'idle' | 'saved' | 'error'>('idle')

  // Filter the picker by free-text search across manufacturer + name.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return aircraft
    return aircraft.filter(a =>
      a.manufacturer.toLowerCase().includes(q) ||
      a.common_name.toLowerCase().includes(q) ||
      a.model.toLowerCase().includes(q),
    )
  }, [aircraft, search])

  // Quick lookup so we can show a chip with the currently-selected aircraft.
  const currentAircraft = aircraft.find(a => a.id === selected) ?? null

  function handleSave(newId: string) {
    setSelected(newId)
    setStatus('idle')
    startTransition(async () => {
      const res = await saveDefaultAircraft(newId || null)
      if (res.error) {
        setStatus('error')
      } else {
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 2000)
      }
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {currentAircraft ? (
          <span style={chipStyle}>
            <span style={{ marginRight: '0.4rem' }}>✈</span>
            {currentAircraft.common_name}
          </span>
        ) : (
          <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>No aircraft selected.</span>
        )}
        {selected && (
          <button
            type="button"
            onClick={() => handleSave('')}
            disabled={isPending}
            style={clearBtnStyle}
          >
            Clear
          </button>
        )}
        {status === 'saved' && <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>Saved</span>}
        {status === 'error' && <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>Error</span>}
      </div>

      <input
        type="text"
        placeholder="Search by manufacturer or model (e.g., Cirrus, PA-18, King Air)…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={searchStyle}
      />

      <div style={listStyle}>
        {filtered.length === 0 ? (
          <p style={{ margin: '0.75rem', fontSize: '0.85rem', color: '#9ca3af' }}>
            No aircraft match. Try a shorter search.
          </p>
        ) : (
          filtered.map(a => {
            const active = a.id === selected
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => handleSave(a.id)}
                disabled={isPending}
                style={{
                  ...rowStyle,
                  backgroundColor: active ? '#eef2ff' : 'white',
                  borderColor:     active ? '#6366f1' : '#e5e7eb',
                  color:           active ? '#4338ca' : '#111827',
                  fontWeight:      active ? 600 : 400,
                }}
              >
                <span>{a.common_name}</span>
                <span style={{ color: '#9ca3af', fontSize: '0.78rem', marginLeft: '0.5rem' }}>
                  {a.wingspan_ft.toFixed(1)}′ wing · {a.height_ft.toFixed(1)}′ tall · {a.length_ft.toFixed(1)}′ long
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

const chipStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  padding: '0.35rem 0.75rem',
  borderRadius: '999px',
  backgroundColor: '#eef2ff',
  color: '#4338ca',
  fontSize: '0.85rem',
  fontWeight: 600,
  border: '1px solid #c7d2fe',
}

const clearBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#6b7280',
  fontSize: '0.78rem',
  cursor: 'pointer',
  textDecoration: 'underline',
  padding: 0,
}

const searchStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.55rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.9rem',
  marginBottom: '0.5rem',
  outline: 'none',
  boxSizing: 'border-box',
}

const listStyle: React.CSSProperties = {
  maxHeight: '320px',
  overflowY: 'auto',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  backgroundColor: 'white',
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  textAlign: 'left',
  padding: '0.55rem 0.85rem',
  border: 'none',
  borderBottom: '1px solid #f3f4f6',
  cursor: 'pointer',
  fontSize: '0.875rem',
  background: 'white',
}
