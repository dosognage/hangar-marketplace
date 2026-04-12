'use client'

import { useState } from 'react'

export type ListingRow = {
  id: string
  title: string
  airport_code: string
  city: string
  state: string
  status: string
  views: number
  contacts: number
  saves: number
  shares: number
  photoViews: number
  conversionRate: number   // contacts / max(views, 1) * 100
  topPhotoUrl: string | null
  coverPhotoUrl: string | null
}

type SortKey = 'views' | 'contacts' | 'saves' | 'shares' | 'photoViews' | 'conversionRate' | 'title'
type SortDir = 'desc' | 'asc'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'views',          label: 'Most Viewed' },
  { key: 'contacts',       label: 'Most Inquiries' },
  { key: 'saves',          label: 'Most Saved' },
  { key: 'shares',         label: 'Most Shared' },
  { key: 'photoViews',     label: 'Most Photo Interactions' },
  { key: 'conversionRate', label: 'Best Conversion Rate' },
  { key: 'title',          label: 'Name (A–Z)' },
]

const STATUS_COLOR: Record<string, string> = {
  approved: '#16a34a',
  pending:  '#d97706',
  rejected: '#dc2626',
}

function SortIcon({ dir, active }: { dir: SortDir; active: boolean }) {
  const color = active ? '#6366f1' : '#d1d5db'
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" fill="none" style={{ marginLeft: '4px', flexShrink: 0 }}>
      <path d="M5 0L9 4H1L5 0Z" fill={active && dir === 'asc'  ? color : '#d1d5db'} />
      <path d="M5 12L1 8H9L5 12Z" fill={active && dir === 'desc' ? color : '#d1d5db'} />
    </svg>
  )
}

export default function BrokerListingsTable({ rows }: { rows: ListingRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('views')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleColumnClick(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir(key === 'title' ? 'asc' : 'desc')
    }
  }

  function handleDropdownChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSortKey(e.target.value as SortKey)
    setSortDir(e.target.value === 'title' ? 'asc' : 'desc')
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    }
    return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number)
  })

  const cols: { key: SortKey; label: string; align?: 'right' }[] = [
    { key: 'title',          label: 'Listing' },
    { key: 'views',          label: 'Views',       align: 'right' },
    { key: 'contacts',       label: 'Inquiries',   align: 'right' },
    { key: 'saves',          label: 'Saves',       align: 'right' },
    { key: 'shares',         label: 'Shares',      align: 'right' },
    { key: 'photoViews',     label: 'Photo Views', align: 'right' },
    { key: 'conversionRate', label: 'Conv. %',     align: 'right' },
  ]

  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>

      {/* Header row with dropdown sort */}
      <div style={{
        padding: '0.85rem 1.25rem', borderBottom: '1px solid #f3f4f6',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#374151' }}>
          Listing Breakdown
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>Sort by</label>
          <select
            value={sortKey}
            onChange={handleDropdownChange}
            style={{
              fontSize: '0.78rem', padding: '0.3rem 0.6rem',
              border: '1px solid #e5e7eb', borderRadius: '6px',
              backgroundColor: 'white', color: '#374151', cursor: 'pointer',
            }}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
          {/* Toggle asc/desc */}
          <button
            onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
            title={sortDir === 'desc' ? 'Highest first' : 'Lowest first'}
            style={{
              border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.3rem 0.5rem',
              backgroundColor: 'white', cursor: 'pointer', fontSize: '0.75rem', color: '#6b7280',
              display: 'flex', alignItems: 'center', gap: '0.2rem',
            }}
          >
            {sortDir === 'desc' ? '↓' : '↑'}
          </button>
        </div>
      </div>

      {/* Table — click any column header to sort */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              {/* Status — not sortable */}
              <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: '600',
                color: '#6b7280', fontSize: '0.7rem', textTransform: 'uppercase',
                letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                Status
              </th>
              {cols.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleColumnClick(col.key)}
                  style={{
                    padding: '0.6rem 1rem',
                    textAlign: col.align ?? 'left',
                    fontWeight: '600',
                    color: sortKey === col.key ? '#6366f1' : '#6b7280',
                    fontSize: '0.7rem', textTransform: 'uppercase',
                    letterSpacing: '0.04em', whiteSpace: 'nowrap',
                    cursor: 'pointer', userSelect: 'none',
                    backgroundColor: sortKey === col.key ? '#f5f3ff' : 'transparent',
                    transition: 'background 0.1s, color 0.1s',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {col.label}
                    <SortIcon dir={sortDir} active={sortKey === col.key} />
                  </span>
                </th>
              ))}
              {/* Top photo — not sortable */}
              <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: '600',
                color: '#6b7280', fontSize: '0.7rem', textTransform: 'uppercase',
                letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                Top Photo
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={row.id} style={{ borderTop: i === 0 ? 'none' : '1px solid #f3f4f6' }}>

                {/* Status badge */}
                <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                  <span style={{
                    display: 'inline-block', padding: '0.15rem 0.55rem',
                    borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700',
                    textTransform: 'capitalize',
                    color: STATUS_COLOR[row.status] ?? '#6b7280',
                    backgroundColor: `${STATUS_COLOR[row.status] ?? '#6b7280'}18`,
                  }}>
                    {row.status}
                  </span>
                </td>

                {/* Listing name */}
                <td style={{ padding: '0.85rem 1rem', maxWidth: '200px' }}>
                  <a href={`/listing/${row.id}`} style={{
                    fontWeight: '600', color: '#111827', textDecoration: 'none',
                    display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {row.title}
                  </a>
                  <span style={{ color: '#9ca3af', fontSize: '0.7rem' }}>
                    {row.airport_code} · {row.city}, {row.state}
                  </span>
                </td>

                {/* Numeric columns */}
                <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: '700', color: '#111827' }}>
                  {row.views.toLocaleString()}
                </td>
                <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#374151' }}>
                  {row.contacts}
                </td>
                <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#374151' }}>
                  {row.saves}
                </td>
                <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#374151' }}>
                  {row.shares}
                </td>
                <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#374151' }}>
                  {row.photoViews}
                </td>
                <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                  <span style={{
                    color: row.conversionRate >= 5 ? '#16a34a' : row.conversionRate >= 1 ? '#d97706' : '#9ca3af',
                    fontWeight: '600',
                  }}>
                    {row.conversionRate.toFixed(1)}%
                  </span>
                </td>

                {/* Top photo */}
                <td style={{ padding: '0.85rem 1rem' }}>
                  {(row.topPhotoUrl || row.coverPhotoUrl) ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <img
                        src={row.topPhotoUrl ?? row.coverPhotoUrl!}
                        alt="Top photo"
                        style={{ width: '40px', height: '32px', objectFit: 'cover',
                          borderRadius: '4px', border: '1px solid #e5e7eb' }}
                      />
                      {row.topPhotoUrl && (
                        <span style={{ fontSize: '0.65rem', color: '#9ca3af' }}>most viewed</span>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: '#d1d5db', fontSize: '0.75rem' }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
