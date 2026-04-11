'use client'

/**
 * HomesSplitView — Zillow-style split layout for Airport Homes & Land.
 *
 * Desktop: 420px card panel on the left, map fills the right.
 * Mobile:  map fills the screen, bottom sheet slides up to reveal cards.
 *
 * Filters (type, listing type, state, keyword) live in the card panel header
 * and navigate to the same URL with updated search params.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { MapBounds } from './MapView'
import { useRouter } from 'next/navigation'
import { RADIUS_OPTIONS } from '@/lib/geocode'

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#f3f4f6', color: '#9ca3af', fontSize: '0.9rem',
    }}>
      Loading map…
    </div>
  ),
})

type Photo = { storage_path: string; display_order: number }

export type HomeListing = {
  id: string
  title: string
  city: string
  state: string
  airport_name: string
  airport_code: string
  property_type: string
  listing_type: string
  asking_price: number | null
  monthly_lease: number | null
  bedrooms: number | null
  bathrooms: number | null
  home_sqft: number | null
  lot_acres: number | null
  has_runway_access: boolean | null
  airpark_name: string | null
  latitude: number | null
  longitude: number | null
  is_sample: boolean
  listing_photos: Photo[]
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  airport_home:     'Airport Home',
  land:             'Land / Lot',
  fly_in_community: 'Fly-in Community',
}

const PROPERTY_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  airport_home:     { bg: '#dbeafe', text: '#1e40af' },
  land:             { bg: '#dcfce7', text: '#166534' },
  fly_in_community: { bg: '#ede9fe', text: '#5b21b6' },
}

const US_STATES = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
  ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],
  ['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],
  ['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],
  ['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],
  ['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],
  ['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],
  ['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],
  ['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],
  ['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
]

type Props = {
  listings: HomeListing[]
  supabaseUrl: string
  // Active filter values (from URL)
  initialQ?: string
  initialType?: string
  initialState?: string
  initialListingType?: string
  initialRadius?: string
}

const PAGE_SIZE = 15

function formatPrice(l: HomeListing) {
  if (l.asking_price) return `$${l.asking_price.toLocaleString()}`
  if (l.monthly_lease) return `$${l.monthly_lease.toLocaleString()}/mo`
  return 'Contact for price'
}


export default function HomesSplitView({
  listings,
  supabaseUrl,
  initialQ = '',
  initialType = '',
  initialState = '',
  initialListingType = '',
  initialRadius = '',
}: Props) {
  const router = useRouter()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [, setMapBounds] = useState<MapBounds | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [sheetOpen, setSheetOpen] = useState(false)
  const touchStartY = useRef(0)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const panelRef = useRef<HTMLDivElement | null>(null)

  // Local filter state (mirrors URL; changes navigate)
  const [searchQ, setSearchQ] = useState(initialQ)
  const [typeFilter, setTypeFilter] = useState(initialType)
  const [stateFilter, setStateFilter] = useState(initialState)
  const [listingTypeFilter, setListingTypeFilter] = useState(initialListingType)
  const [radiusFilter, setRadiusFilter] = useState(initialRadius)

  const handleBoundsChange = useCallback((b: MapBounds) => {
    setMapBounds(b)
  }, [])

  // Navigate with updated search params
  function applyFilters(overrides: Record<string, string>) {
    const params = new URLSearchParams()
    const q      = overrides.q      ?? searchQ
    const type   = overrides.type   ?? typeFilter
    const st     = overrides.state  ?? stateFilter
    const lt     = overrides.listing_type ?? listingTypeFilter
    const rad    = overrides.radius ?? radiusFilter
    if (q.trim())        params.set('q', q.trim())
    if (type)            params.set('type', type)
    if (st)              params.set('state', st)
    if (lt)              params.set('listing_type', lt)
    if (rad && q.trim()) params.set('radius', rad)
    router.push(`/airport-homes${params.toString() ? `?${params}` : ''}`)
  }

  const mappable = listings.filter(
    (l): l is HomeListing & { latitude: number; longitude: number } =>
      l.latitude != null && l.longitude != null
  )

  // Sort: all listings (no sponsored/featured for homes yet)
  const sortedListings = useMemo(() => [...listings], [listings])

  const totalPages   = Math.ceil(sortedListings.length / PAGE_SIZE)
  const pageStart    = (currentPage - 1) * PAGE_SIZE
  const pageListings = sortedListings.slice(pageStart, pageStart + PAGE_SIZE)

  function goToPage(page: number) {
    setCurrentPage(page)
    if (panelRef.current) panelRef.current.scrollTop = 0
    setSheetOpen(false)
  }

  const handleMarkerClick = useCallback((id: string) => {
    // Find which page the listing is on
    const idx = sortedListings.findIndex(l => l.id === id)
    if (idx !== -1) {
      const targetPage = Math.floor(idx / PAGE_SIZE) + 1
      setCurrentPage(targetPage)
    }
    setHoveredId(id)
    setSheetOpen(true)
    setTimeout(() => {
      const el = cardRefs.current[id]
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)
  }, [sortedListings])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setHoveredId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function onHandleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
  }
  function onHandleTouchEnd(e: React.TouchEvent) {
    const delta = e.changedTouches[0].clientY - touchStartY.current
    if (delta < -30) setSheetOpen(true)
    if (delta > 30)  setSheetOpen(false)
  }

  function photoUrl(path: string) {
    return `${supabaseUrl}/storage/v1/object/public/listing-photos/${path}`
  }

  const listingCount = sortedListings.length
  const hasFilters = !!(initialQ || initialType || initialState || initialListingType || initialRadius)

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>

      {/* ── Full-bleed map ────────────────────────────────────────────────── */}
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 0 }}>
        {mappable.length === 0 ? (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: '#e5e7eb', color: '#6b7280', gap: '0.5rem',
          }}>
            <span style={{ fontSize: '2.5rem' }}>🏡</span>
            <p style={{ margin: 0 }}>No map coordinates available yet.</p>
          </div>
        ) : (
          <MapView
            listings={mappable}
            hoveredId={hoveredId}
            onMarkerClick={handleMarkerClick}
            onBoundsChange={handleBoundsChange}
          />
        )}
      </div>

      {/* ── Card panel — desktop: left sidebar / mobile: bottom sheet ─────── */}
      <div
        ref={panelRef}
        className={`split-cards-panel${sheetOpen ? ' sheet-open' : ''}`}
        style={{
          position: 'absolute',
          top: 0, left: 0, bottom: 0,
          width: '420px',
          overflowY: 'auto',
          backgroundColor: 'rgba(255,255,255,0.97)',
          boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Bottom sheet drag handle — mobile only ─────────────────────── */}
        <div
          className="sheet-drag-handle"
          onClick={() => setSheetOpen(o => !o)}
          onTouchStart={onHandleTouchStart}
          onTouchEnd={onHandleTouchEnd}
        >
          <div className="sheet-handle-pill" />
          <div className="sheet-handle-row">
            <span className="sheet-handle-count">
              {listingCount > 0
                ? `${listingCount} propert${listingCount !== 1 ? 'ies' : 'y'}`
                : 'No properties found'}
            </span>
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={`sheet-chevron${sheetOpen ? ' sheet-chevron--open' : ''}`}
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </div>
        </div>

        {/* ── Filter panel ───────────────────────────────────────────────── */}
        <div style={{
          padding: '0.75rem',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#fafafa',
          flexShrink: 0,
        }}>
          {/* Property type pills */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
            {[
              { val: '', label: 'All' },
              { val: 'airport_home', label: '🏠 Homes' },
              { val: 'land', label: '🌿 Land' },
              { val: 'fly_in_community', label: '✈ Fly-in' },
            ].map(({ val, label }) => {
              const active = typeFilter === val
              return (
                <button
                  key={val}
                  onClick={() => {
                    setTypeFilter(val)
                    setCurrentPage(1)
                    applyFilters({ type: val })
                  }}
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.78rem',
                    fontWeight: active ? '700' : '500',
                    border: `1.5px solid ${active ? '#6366f1' : '#d1d5db'}`,
                    backgroundColor: active ? '#6366f1' : 'white',
                    color: active ? 'white' : '#374151',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </button>
              )
            })}
            {/* For Sale / For Lease */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.25rem' }}>
              {[
                { val: '', label: 'Any' },
                { val: 'sale', label: 'Sale' },
                { val: 'lease', label: 'Lease' },
              ].map(({ val, label }) => {
                const active = listingTypeFilter === val
                return (
                  <button
                    key={val}
                    onClick={() => {
                      setListingTypeFilter(val)
                      setCurrentPage(1)
                      applyFilters({ listing_type: val })
                    }}
                    style={{
                      padding: '0.3rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: active ? '700' : '400',
                      border: `1.5px solid ${active ? '#111827' : '#d1d5db'}`,
                      backgroundColor: active ? '#111827' : 'white',
                      color: active ? 'white' : '#6b7280',
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Keyword + state search */}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <input
              type="text"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  setCurrentPage(1)
                  applyFilters({ q: searchQ })
                }
              }}
              placeholder="City, airport, or community…"
              style={{
                flex: '1 1 0', minWidth: 0,
                padding: '0.45rem 0.7rem',
                border: '1px solid #d1d5db', borderRadius: '7px',
                fontSize: '0.8rem', backgroundColor: 'white',
                outline: 'none',
              }}
            />
            <select
              value={stateFilter}
              onChange={e => {
                setStateFilter(e.target.value)
                setCurrentPage(1)
                applyFilters({ state: e.target.value })
              }}
              style={{
                padding: '0.45rem 0.5rem',
                border: '1px solid #d1d5db', borderRadius: '7px',
                fontSize: '0.8rem', backgroundColor: 'white',
                color: stateFilter ? '#111827' : '#6b7280',
                minWidth: '100px',
              }}
            >
              <option value="">All states</option>
              {US_STATES.map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
            <button
              onClick={() => { setCurrentPage(1); applyFilters({ q: searchQ }) }}
              style={{
                padding: '0.45rem 0.75rem',
                backgroundColor: '#111827', color: 'white',
                border: 'none', borderRadius: '7px',
                fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Search
            </button>
          </div>

          {/* Radius filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>Search radius:</span>
            <select
              value={radiusFilter}
              onChange={e => {
                setRadiusFilter(e.target.value)
                setCurrentPage(1)
                applyFilters({ radius: e.target.value })
              }}
              style={{
                padding: '0.35rem 0.5rem',
                border: '1px solid #d1d5db', borderRadius: '7px',
                fontSize: '0.78rem', backgroundColor: 'white',
                color: radiusFilter ? '#111827' : '#6b7280',
                minWidth: '130px',
              }}
            >
              <option value="">Any distance</option>
              {RADIUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {radiusFilter && !searchQ && (
              <span style={{ fontSize: '0.7rem', color: '#f59e0b' }}>
                Enter a city or airport first
              </span>
            )}
          </div>

          {/* Clear filters + count */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
            <p className="desktop-count-line" style={{ margin: 0, fontSize: '0.78rem', color: '#6b7280' }}>
              {listingCount} propert{listingCount !== 1 ? 'ies' : 'y'}
              {totalPages > 1 && ` · page ${currentPage} of ${totalPages}`}
            </p>
            {hasFilters && (
              <Link
                href="/airport-homes"
                style={{ fontSize: '0.75rem', color: '#6366f1', textDecoration: 'none', fontWeight: '500' }}
              >
                Clear filters ×
              </Link>
            )}
          </div>
        </div>

        {/* ── Empty state ─────────────────────────────────────────────────── */}
        {listingCount === 0 && (
          <div style={{ padding: '3rem 1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏡</div>
            <p style={{ fontWeight: '700', color: '#111827', margin: '0 0 0.4rem' }}>No properties found</p>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 1.25rem' }}>
              Try a different search or clear the filters.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/airport-homes" style={{
                display: 'inline-block', padding: '0.5rem 1.1rem',
                backgroundColor: '#111827', color: 'white',
                borderRadius: '7px', textDecoration: 'none',
                fontWeight: '600', fontSize: '0.85rem',
              }}>
                See all properties
              </Link>
              <Link href="/submit" style={{
                display: 'inline-block', padding: '0.5rem 1.1rem',
                backgroundColor: '#6366f1', color: 'white',
                borderRadius: '7px', textDecoration: 'none',
                fontWeight: '600', fontSize: '0.85rem',
              }}>
                List your property
              </Link>
            </div>
          </div>
        )}

        {/* ── Listing cards ───────────────────────────────────────────────── */}
        <div style={{ padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
          {pageListings.map((listing) => {
            const isHovered = listing.id === hoveredId
            const sortedPhotos = [...(listing.listing_photos ?? [])].sort(
              (a, b) => a.display_order - b.display_order
            )
            const coverPath = sortedPhotos[0]?.storage_path ?? null
            const ptColors = PROPERTY_TYPE_COLORS[listing.property_type] ?? PROPERTY_TYPE_COLORS.airport_home
            const ptLabel  = PROPERTY_TYPE_LABELS[listing.property_type] ?? listing.property_type
            const listingLabel = listing.listing_type === 'sale' ? 'For Sale'
              : listing.listing_type === 'lease' ? 'For Lease' : ''
            const price = formatPrice(listing)

            return (
              <div
                key={listing.id}
                ref={el => { cardRefs.current[listing.id] = el }}
                onMouseEnter={() => setHoveredId(listing.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <Link href={`/listing/${listing.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '10px',
                    border: `2px solid ${isHovered ? '#6366f1' : 'transparent'}`,
                    boxShadow: isHovered
                      ? '0 4px 16px rgba(99,102,241,0.2)'
                      : '0 1px 4px rgba(0,0,0,0.07)',
                    overflow: 'hidden',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'row',
                    height: '110px',
                  }}>
                    {/* Left: photo */}
                    <div style={{ width: '130px', flexShrink: 0, position: 'relative', backgroundColor: '#f3f4f6' }}>
                      {coverPath ? (
                        <img
                          src={photoUrl(coverPath)}
                          alt={listing.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        <div style={{
                          width: '100%', height: '100%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.75rem', color: '#d1d5db',
                        }}>🏡</div>
                      )}
                      {/* Property type badge */}
                      <span style={{
                        position: 'absolute', bottom: '4px', left: '4px',
                        padding: '0.1rem 0.4rem', borderRadius: '4px',
                        fontSize: '0.62rem', fontWeight: '700',
                        backgroundColor: ptColors.bg, color: ptColors.text,
                        whiteSpace: 'nowrap',
                      }}>
                        {ptLabel}
                      </span>
                      {listing.is_sample && (
                        <span style={{
                          position: 'absolute', top: '4px', left: '4px',
                          padding: '0.18rem 0.5rem', borderRadius: '5px',
                          fontSize: '0.62rem', fontWeight: '600',
                          letterSpacing: '0.04em', textTransform: 'uppercase',
                          backgroundColor: 'rgba(15, 23, 42, 0.72)',
                          backdropFilter: 'blur(6px)',
                          WebkitBackdropFilter: 'blur(6px)',
                          color: 'rgba(255,255,255,0.92)',
                          border: '1px solid rgba(255,255,255,0.12)',
                        }}>
                          Sample
                        </span>
                      )}
                    </div>

                    {/* Right: info */}
                    <div style={{ flex: 1, padding: '0.6rem 0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.4rem', marginBottom: '0.2rem' }}>
                          <span style={{ fontWeight: '800', fontSize: '1rem', color: '#111827', whiteSpace: 'nowrap' }}>
                            {price}
                          </span>
                          {listingLabel && (
                            <span style={{
                              padding: '0.1rem 0.45rem', borderRadius: '999px',
                              fontSize: '0.65rem', fontWeight: '700', whiteSpace: 'nowrap',
                              backgroundColor: listing.listing_type === 'sale' ? '#dbeafe' : '#dcfce7',
                              color: listing.listing_type === 'sale' ? '#1e40af' : '#166534',
                            }}>
                              {listingLabel}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: '0 0 0.15rem', fontWeight: '600', fontSize: '0.82rem', color: '#111827', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {listing.title}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.73rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {listing.airport_code} · {listing.city}, {listing.state}
                          {listing.airpark_name ? ` · ${listing.airpark_name}` : ''}
                        </p>
                      </div>

                      {/* Specs row */}
                      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                        {listing.bedrooms != null && (
                          <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>🛏 {listing.bedrooms}bd</span>
                        )}
                        {listing.bathrooms != null && (
                          <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>🚿 {listing.bathrooms}ba</span>
                        )}
                        {listing.home_sqft != null && (
                          <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>📐 {listing.home_sqft.toLocaleString()} ft²</span>
                        )}
                        {listing.lot_acres != null && (
                          <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>🌿 {listing.lot_acres} ac</span>
                        )}
                        {listing.has_runway_access && (
                          <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: '600' }}>✈ Runway</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>

        {/* ── Pagination ──────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.3rem', padding: '0.6rem', flexWrap: 'wrap',
            borderTop: '1px solid #f3f4f6', flexShrink: 0,
          }}>
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
              style={pageNavStyle(currentPage === 1)}>
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button key={page} onClick={() => goToPage(page)} style={pageNumStyle(page === currentPage)}>
                {page}
              </button>
            ))}
            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}
              style={pageNavStyle(currentPage === totalPages)}>
              Next →
            </button>
          </div>
        )}

        {/* ── List your property CTA ──────────────────────────────────────── */}
        <div style={{
          padding: '0.75rem',
          borderTop: '1px solid #f3f4f6',
          backgroundColor: '#fafafa',
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.4 }}>
            Have an airport property? List it free.
          </p>
          <Link href="/submit" style={{
            padding: '0.4rem 0.85rem',
            backgroundColor: '#6366f1', color: 'white',
            borderRadius: '7px', textDecoration: 'none',
            fontWeight: '700', fontSize: '0.78rem', whiteSpace: 'nowrap',
          }}>
            List property
          </Link>
        </div>
      </div>

    </div>
  )
}

// ── Style helpers ─────────────────────────────────────────────────────────

function pageNavStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '0.3rem 0.65rem', fontSize: '0.78rem', fontWeight: '600',
    borderRadius: '6px', border: '1px solid #d1d5db',
    backgroundColor: disabled ? '#f3f4f6' : 'white',
    color: disabled ? '#9ca3af' : '#111827',
    cursor: disabled ? 'default' : 'pointer',
  }
}

function pageNumStyle(active: boolean): React.CSSProperties {
  return {
    width: '30px', height: '30px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.78rem', fontWeight: active ? '700' : '400',
    borderRadius: '6px',
    border: active ? '2px solid #6366f1' : '1px solid #d1d5db',
    backgroundColor: active ? '#eef2ff' : 'white',
    color: active ? '#4338ca' : '#374151',
    cursor: active ? 'default' : 'pointer',
  }
}
