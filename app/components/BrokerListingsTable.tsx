'use client'

import { Fragment, useState } from 'react'
import type { ListingHealth } from '@/lib/listingHealth'

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
  health: ListingHealth
}

type SortKey = 'views' | 'contacts' | 'saves' | 'shares' | 'photoViews' | 'conversionRate' | 'title' | 'health'
type SortDir = 'desc' | 'asc'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'health',         label: 'Health Score' },
  { key: 'views',          label: 'Most Viewed' },
  { key: 'contacts',       label: 'Most Inquiries' },
  { key: 'saves',          label: 'Most Saved' },
  { key: 'shares',         label: 'Most Shared' },
  { key: 'photoViews',     label: 'Most Photo Interactions' },
  { key: 'conversionRate', label: 'Best Conversion Rate' },
  { key: 'title',          label: 'Name (A–Z)' },
]

const SEVERITY_COLOR: Record<string, string> = {
  bad:  '#dc2626',
  warn: '#d97706',
  ok:   '#2563eb',
  good: '#16a34a',
}

const STATUS_COLOR: Record<string, string> = {
  approved: '#16a34a',
  pending:  '#d97706',
  rejected: '#dc2626',
  sold:     '#0e7490',
  closed:   '#0e7490',
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
  // Default to health score so brokers see "what's hurt" first.
  const [sortKey, setSortKey] = useState<SortKey>('health')
  const [sortDir, setSortDir] = useState<SortDir>('asc')   // ascending = lowest health first
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

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
    if (sortKey === 'health') {
      const av = a.health.score, bv = b.health.score
      return sortDir === 'desc' ? bv - av : av - bv
    }
    const av = a[sortKey as keyof ListingRow]
    const bv = b[sortKey as keyof ListingRow]
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    }
    return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number)
  })

  const cols: { key: SortKey; label: string; align?: 'right' }[] = [
    { key: 'title',          label: 'Listing' },
    { key: 'health',         label: 'Health',      align: 'right' },
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
              {/* Actions — not sortable */}
              <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: '600',
                color: '#6b7280', fontSize: '0.7rem', textTransform: 'uppercase',
                letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <Fragment key={row.id}>
              <tr style={{ borderTop: i === 0 ? 'none' : '1px solid #f3f4f6' }}>

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

                {/* Listing name — includes tab=analytics so the listing detail
                    page's back-button returns the broker to this view, not browse. */}
                <td style={{ padding: '0.85rem 1rem', maxWidth: '200px' }}>
                  <a href={`/listing/${row.id}?from=broker-dashboard&tab=analytics`} style={{
                    fontWeight: '600', color: '#111827', textDecoration: 'none',
                    display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {row.title}
                  </a>
                  <span style={{ color: '#9ca3af', fontSize: '0.7rem' }}>
                    {row.airport_code} · {row.city}, {row.state}
                  </span>
                </td>

                {/* Health score badge */}
                <td style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button
                    onClick={() => setExpanded(prev => ({ ...prev, [row.id]: !prev[row.id] }))}
                    title={expanded[row.id] ? 'Hide suggestions' : 'Show suggestions'}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                      padding: '0.2rem 0.65rem', borderRadius: '999px', border: 'none',
                      backgroundColor: `${row.health.bandColor}18`,
                      color: row.health.bandColor, fontWeight: 700, fontSize: '0.78rem',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{row.health.score}</span>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {row.health.band}
                    </span>
                    <svg width="9" height="9" viewBox="0 0 9 9"
                      style={{ transform: expanded[row.id] ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>
                      <path d="M1 3 L4.5 6.5 L8 3" stroke={row.health.bandColor} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                    </svg>
                  </button>
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

                {/* Actions */}
                <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <a
                      href={`/listing/${row.id}?from=broker-dashboard&tab=analytics`}
                      style={{
                        fontSize: '0.75rem', color: '#6366f1', textDecoration: 'none',
                        padding: '0.25rem 0.6rem', border: '1px solid #c7d2fe',
                        borderRadius: '5px', backgroundColor: '#eef2ff', fontWeight: '500',
                      }}
                    >
                      View
                    </a>
                    {row.status === 'sold' || row.status === 'closed' ? (
                      <a
                        href={`/listing/${row.id}/mark-sold`}
                        style={{
                          fontSize: '0.75rem', color: '#0e7490', textDecoration: 'none',
                          padding: '0.25rem 0.6rem', border: '1px solid #67e8f9',
                          borderRadius: '5px', backgroundColor: '#ecfeff', fontWeight: 600,
                        }}
                      >
                        View sale recap →
                      </a>
                    ) : (
                      <>
                        <a
                          href={`/listing/${row.id}/edit`}
                          style={{
                            fontSize: '0.75rem', color: '#374151', textDecoration: 'none',
                            padding: '0.25rem 0.6rem', border: '1px solid #d1d5db',
                            borderRadius: '5px', backgroundColor: 'white', fontWeight: '500',
                          }}
                        >
                          Edit
                        </a>
                        <a
                          href={`/listing/${row.id}/mark-sold`}
                          style={{
                            fontSize: '0.75rem', color: '#15803d', textDecoration: 'none',
                            padding: '0.25rem 0.6rem', border: '1px solid #86efac',
                            borderRadius: '5px', backgroundColor: '#f0fdf4', fontWeight: 600,
                          }}
                        >
                          Mark as Sold
                        </a>
                      </>
                    )}
                  </div>
                </td>
              </tr>
              {/* Expanded health diagnostics — toggled via the health badge */}
              {expanded[row.id] && (
                <tr style={{ backgroundColor: '#fafbff' }}>
                  <td colSpan={11} style={{ padding: '0.9rem 1.5rem 1.4rem' }}>
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 2fr',
                      gap: '1.5rem', alignItems: 'start',
                    }}>
                      {/* Left: comparable-market context */}
                      <div style={{
                        padding: '0.85rem 1rem', backgroundColor: 'white',
                        border: '1px solid #e5e7eb', borderRadius: '8px',
                      }}>
                        <p style={{
                          margin: '0 0 0.4rem', fontSize: '0.65rem', fontWeight: 700,
                          color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}>
                          Compared to similar listings
                        </p>
                        <div style={{ display: 'grid', gap: '0.4rem', fontSize: '0.78rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#6b7280' }}>Same airport</span>
                            <strong style={{ color: '#111827' }}>{row.health.comparables.countSameAirport}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#6b7280' }}>Same property type</span>
                            <strong style={{ color: '#111827' }}>{row.health.comparables.countSameType}</strong>
                          </div>
                          {row.health.comparables.medianAskingPrice !== null && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#6b7280' }}>Median price</span>
                              <strong style={{ color: '#111827' }}>${row.health.comparables.medianAskingPrice.toLocaleString()}</strong>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#6b7280' }}>Avg views</span>
                            <strong style={{ color: '#111827' }}>{Math.round(row.health.comparables.avgViewCount)}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.4rem', borderTop: '1px solid #f3f4f6', marginTop: '0.2rem' }}>
                            <span style={{ color: '#6b7280' }}>You vs avg</span>
                            <strong style={{
                              color: row.health.comparables.yourViewMultiple >= 1
                                ? '#16a34a' : row.health.comparables.yourViewMultiple >= 0.5 ? '#d97706' : '#dc2626',
                            }}>
                              {(row.health.comparables.yourViewMultiple * 100).toFixed(0)}%
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Right: ranked suggestions */}
                      <div>
                        <p style={{
                          margin: '0 0 0.6rem', fontSize: '0.65rem', fontWeight: 700,
                          color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}>
                          Suggestions
                        </p>
                        {row.health.suggestions.map((s, idx) => (
                          <div key={idx} style={{
                            padding: '0.7rem 0.9rem', marginBottom: '0.5rem',
                            borderLeft: `3px solid ${SEVERITY_COLOR[s.severity]}`,
                            backgroundColor: 'white', border: '1px solid #f3f4f6',
                            borderRadius: '0 8px 8px 0',
                          }}>
                            <p style={{ margin: '0 0 0.25rem', fontSize: '0.86rem', fontWeight: 700, color: '#111827' }}>
                              {s.emoji} {s.title}
                            </p>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>
                              {s.detail}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
