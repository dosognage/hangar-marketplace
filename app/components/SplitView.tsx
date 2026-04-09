'use client'

/**
 * SplitView — dual-mode layout
 *
 * Desktop: 400px card panel on left, map fills right
 * Mobile:  map fills full screen, floating search bar on top,
 *          bottom sheet slides up to show cards (peek → open)
 */

import { useState, useRef, useCallback, useEffect, useTransition, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { MapListing, MapBounds } from './MapView'
import { toggleSavedListing } from '@/app/actions/listings'
import HeartIcon from './HeartIcon'
import { Star } from 'lucide-react'
import { useToast } from './ToastProvider'
import { useSavedCount } from './SavedCountProvider'
import MobileSearchBar from './MobileSearchBar'

// Load the map lazily — Leaflet requires a browser environment
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

type Listing = Omit<MapListing, 'latitude' | 'longitude'> & {
  latitude: number | null
  longitude: number | null
  ownership_type: string
  square_feet: number | null
  door_width: number | null
  door_height: number | null
  description: string | null
  is_featured: boolean
  featured_until: string | null
  is_sponsored: boolean
  sponsored_until: string | null
  listing_photos: Photo[]
}

// Helpers
function isActiveFeatured(l: Listing) {
  return l.is_featured && l.featured_until != null && new Date(l.featured_until) > new Date()
}
function isActiveSponsored(l: Listing) {
  return l.is_sponsored && l.sponsored_until != null && new Date(l.sponsored_until) > new Date()
}
function inBounds(l: Listing, b: MapBounds | null) {
  if (!b || l.latitude == null || l.longitude == null) return false
  return l.latitude <= b.north && l.latitude >= b.south &&
         l.longitude <= b.east && l.longitude >= b.west
}

type Props = {
  listings: Listing[]
  supabaseUrl: string
  savedIds: string[]
  userId: string | null
  // Filter values passed through for the mobile floating search bar
  initialQ?: string
  initialType?: string
  initialMinPrice?: string
  initialMaxPrice?: string
  initialMinSqft?: string
}

const PAGE_SIZE = 12

export default function SplitView({
  listings,
  supabaseUrl,
  savedIds,
  userId,
  initialQ = '',
  initialType = '',
  initialMinPrice = '',
  initialMaxPrice = '',
  initialMinSqft = '',
}: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [savedSet, setSavedSet] = useState<Set<string>>(() => new Set(savedIds))
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()
  const { addToast } = useToast()
  const { incrementSaved, decrementSaved } = useSavedCount()
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const panelRef = useRef<HTMLDivElement | null>(null)

  // Mobile bottom sheet: false = peek (~220px), true = open (~68vh)
  const [sheetOpen, setSheetOpen] = useState(false)
  const touchStartY = useRef(0)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  // Map viewport — used to geo-filter sponsored listings to top
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null)

  const handleBoundsChange = useCallback((b: MapBounds) => {
    setMapBounds(b)
  }, [])

  // Sort: sponsored-in-viewport → admin-featured → rest
  const sortedListings = useMemo(() => {
    return [...listings].sort((a, b) => {
      const aSponsored = isActiveSponsored(a) && inBounds(a, mapBounds)
      const bSponsored = isActiveSponsored(b) && inBounds(b, mapBounds)
      if (aSponsored && !bSponsored) return -1
      if (!aSponsored && bSponsored) return 1
      const aFeatured = isActiveFeatured(a)
      const bFeatured = isActiveFeatured(b)
      if (aFeatured && !bFeatured) return -1
      if (!aFeatured && bFeatured) return 1
      return 0
    })
  }, [listings, mapBounds])

  const totalPages  = Math.ceil(sortedListings.length / PAGE_SIZE)
  const pageStart   = (currentPage - 1) * PAGE_SIZE
  const pageEnd     = pageStart + PAGE_SIZE
  const pageListings = sortedListings.slice(pageStart, pageEnd)

  const mappable = listings.filter(
    (l): l is Listing & { latitude: number; longitude: number } =>
      l.latitude != null && l.longitude != null
  )

  function handleHeart(e: React.MouseEvent, listingId: string) {
    e.preventDefault()
    e.stopPropagation()
    if (pendingIds.has(listingId)) return

    if (!userId) {
      addToast('Sign in to save listings', 'info')
      return
    }

    const currentlySaved = savedSet.has(listingId)
    setSavedSet(prev => {
      const next = new Set(prev)
      currentlySaved ? next.delete(listingId) : next.add(listingId)
      return next
    })
    setPendingIds(prev => new Set(prev).add(listingId))

    startTransition(async () => {
      await toggleSavedListing(listingId, currentlySaved)
      setPendingIds(prev => {
        const next = new Set(prev)
        next.delete(listingId)
        return next
      })
      if (currentlySaved) {
        decrementSaved()
        addToast('Removed from saved', 'info')
      } else {
        incrementSaved()
        addToast('Listing saved!', 'success')
      }
    })
  }

  function goToPage(page: number) {
    setCurrentPage(page)
    if (panelRef.current) panelRef.current.scrollTop = 0
    // Reset sheet to peek when changing page on mobile so user sees the map
    setSheetOpen(false)
  }

  const handleMarkerClick = useCallback((id: string) => {
    setHoveredId(id)
    setSheetOpen(true) // open sheet when a marker is tapped
    const el = cardRefs.current[id]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [])

  // Keyboard: clear hover on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setHoveredId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Touch handlers for the sheet drag handle
  function onHandleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
  }
  function onHandleTouchEnd(e: React.TouchEvent) {
    const delta = e.changedTouches[0].clientY - touchStartY.current
    if (delta < -30) setSheetOpen(true)   // swipe up → open
    if (delta > 30)  setSheetOpen(false)  // swipe down → peek
  }

  function photoUrl(path: string) {
    return `${supabaseUrl}/storage/v1/object/public/listing-photos/${path}`
  }

  const listingCount = sortedListings.length

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>

      {/* ── Full-bleed map (behind everything) ─────────────────────────── */}
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 0 }}>
        {mappable.length === 0 ? (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: '#e5e7eb', color: '#6b7280', gap: '0.5rem',
          }}>
            <span style={{ fontSize: '2rem' }}>🗺️</span>
            <p style={{ margin: 0 }}>No map coordinates yet.</p>
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

      {/* ── Mobile floating search bar (hidden on desktop via CSS) ──────── */}
      <div className="mobile-search-bar-wrapper">
        <MobileSearchBar
          initialQ={initialQ}
          initialType={initialType}
          initialMinPrice={initialMinPrice}
          initialMaxPrice={initialMaxPrice}
          initialMinSqft={initialMinSqft}
        />
      </div>

      {/* ── Cards panel — desktop: left sidebar / mobile: bottom sheet ──── */}
      <div
        ref={panelRef}
        className={`split-cards-panel${sheetOpen ? ' sheet-open' : ''}`}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '400px',
          overflowY: 'auto',
          backgroundColor: 'rgba(255,255,255,0.97)',
          boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          padding: '0.75rem',
        }}
      >
        {/* ── Bottom sheet drag handle — mobile only ─────────────────── */}
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
                ? `${listingCount} hangar${listingCount !== 1 ? 's' : ''}`
                : 'No hangars found'}
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

        {/* ── Desktop count line (hidden on mobile) ──────────────────── */}
        <p className="desktop-count-line" style={{ margin: '0 0 0.25rem', fontSize: '0.8rem', color: '#6b7280' }}>
          {listingCount} listing{listingCount !== 1 ? 's' : ''}
          {totalPages > 1 && ` · page ${currentPage} of ${totalPages}`}
        </p>

        {/* ── Empty state ─────────────────────────────────────────────── */}
        {listingCount === 0 && (
          <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#d1d5db"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <p style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', margin: '0 0 0.4rem' }}>
              No hangars found
            </p>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 1.25rem' }}>
              Try a different search or clear the filters.
            </p>
            <a href="/" style={{
              display: 'inline-block', padding: '0.55rem 1.25rem', backgroundColor: '#111827',
              color: 'white', borderRadius: '8px', textDecoration: 'none',
              fontWeight: '600', fontSize: '0.875rem',
            }}>
              Clear all filters
            </a>
          </div>
        )}

        {/* ── Listing cards ───────────────────────────────────────────── */}
        {pageListings.map((listing) => {
          const isHovered = listing.id === hoveredId
          const sortedPhotos = [...(listing.listing_photos ?? [])].sort(
            (a, b) => a.display_order - b.display_order
          )
          const coverPath = sortedPhotos[0]?.storage_path ?? null
          const isFeaturedActive  = isActiveFeatured(listing)
          const isSponsoredActive = isActiveSponsored(listing)

          const price = listing.asking_price
            ? `$${listing.asking_price.toLocaleString()}`
            : listing.monthly_lease
              ? `$${listing.monthly_lease.toLocaleString()}/mo`
              : 'Contact for price'

          return (
            <div
              key={listing.id}
              ref={(el) => { cardRefs.current[listing.id] = el }}
              onMouseEnter={() => setHoveredId(listing.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <Link href={`/listing/${listing.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: `2px solid ${isHovered ? '#6366f1' : 'transparent'}`,
                  boxShadow: isHovered
                    ? '0 4px 16px rgba(99,102,241,0.2)'
                    : '0 1px 4px rgba(0,0,0,0.07)',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  position: 'relative',
                }}>
                  {/* Sponsored badge */}
                  {isSponsoredActive && (
                    <div style={{
                      position: 'absolute', top: '8px', left: '8px', zIndex: 11,
                      display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                      padding: '0.18rem 0.5rem', borderRadius: '999px',
                      backgroundColor: '#6366f1', color: 'white',
                      fontSize: '0.68rem', fontWeight: '700',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                      pointerEvents: 'none',
                    }}>
                      Sponsored
                    </div>
                  )}

                  {/* Featured badge */}
                  {isFeaturedActive && !isSponsoredActive && (
                    <div style={{
                      position: 'absolute', top: '8px', left: '8px', zIndex: 10,
                      display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                      padding: '0.18rem 0.5rem', borderRadius: '999px',
                      backgroundColor: '#f59e0b', color: 'white',
                      fontSize: '0.68rem', fontWeight: '700',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                      pointerEvents: 'none',
                    }}>
                      <Star size={10} style={{ flexShrink: 0 }} /> Featured
                    </div>
                  )}

                  {/* Heart button */}
                  <button
                    onClick={(e) => handleHeart(e, listing.id)}
                    disabled={pendingIds.has(listing.id)}
                    title={savedSet.has(listing.id) ? 'Remove from saved' : 'Save listing'}
                    style={{
                      position: 'absolute', top: '8px', right: '8px', zIndex: 10,
                      background: 'rgba(255,255,255,0.88)', border: 'none',
                      borderRadius: '50%', width: '30px', height: '30px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: pendingIds.has(listing.id) ? 'default' : 'pointer',
                      opacity: pendingIds.has(listing.id) ? 0.5 : 1,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                      transition: 'opacity 0.15s', padding: 0,
                      color: savedSet.has(listing.id) ? '#dc2626' : '#6b7280',
                    }}
                  >
                    <HeartIcon filled={savedSet.has(listing.id)} size={16} />
                  </button>

                  {/* Cover photo */}
                  {coverPath ? (
                    <img
                      src={photoUrl(coverPath)}
                      alt={listing.title}
                      style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%', height: '120px', backgroundColor: '#f3f4f6',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#9ca3af', fontSize: '0.8rem',
                    }}>
                      No photos
                    </div>
                  )}

                  <div style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: '700', fontSize: '1rem', color: '#111827' }}>{price}</span>
                      <span style={badgeStyle(listing.listing_type)}>
                        {listing.listing_type === 'sale' ? 'For Sale'
                          : listing.listing_type === 'space' ? 'Space Available'
                          : 'For Lease'}
                      </span>
                    </div>
                    <p style={{ margin: '0.3rem 0 0.1rem', fontWeight: '600', fontSize: '0.875rem', color: '#111827', lineHeight: 1.3 }}>
                      {listing.title}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.775rem', color: '#6b7280' }}>
                      {listing.airport_code} · {listing.city}, {listing.state}
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {listing.square_feet && (
                        <span style={specStyle}>📐 {listing.square_feet.toLocaleString()} sq ft</span>
                      )}
                      {(listing.door_width || listing.door_height) && (
                        <span style={specStyle}>🚪 {listing.door_width ?? '?'}′ × {listing.door_height ?? '?'}′</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )
        })}

        {/* ── Pagination ──────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.35rem', paddingTop: '0.5rem', paddingBottom: '0.25rem',
            flexWrap: 'wrap',
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
      </div>

    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────

function badgeStyle(type: string): React.CSSProperties {
  const colors =
    type === 'sale'  ? { bg: '#dbeafe', text: '#1e40af' } :
    type === 'space' ? { bg: '#fef3c7', text: '#92400e' } :
                       { bg: '#dcfce7', text: '#166534' }
  return {
    padding: '0.15rem 0.5rem',
    borderRadius: '999px',
    fontSize: '0.7rem',
    fontWeight: '600',
    backgroundColor: colors.bg,
    color: colors.text,
    whiteSpace: 'nowrap',
  }
}

const specStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#6b7280',
}

function pageNavStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: '600',
    borderRadius: '6px', border: '1px solid #d1d5db',
    backgroundColor: disabled ? '#f3f4f6' : 'white',
    color: disabled ? '#9ca3af' : '#111827',
    cursor: disabled ? 'default' : 'pointer',
  }
}

function pageNumStyle(active: boolean): React.CSSProperties {
  return {
    width: '32px', height: '32px', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: '0.8rem', fontWeight: active ? '700' : '400',
    borderRadius: '6px',
    border: active ? '2px solid #6366f1' : '1px solid #d1d5db',
    backgroundColor: active ? '#eef2ff' : 'white',
    color: active ? '#4338ca' : '#374151',
    cursor: active ? 'default' : 'pointer',
  }
}
