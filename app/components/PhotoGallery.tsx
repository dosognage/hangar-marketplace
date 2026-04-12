'use client'

/**
 * PhotoGallery
 *
 * Main photo + scrollable thumbnails. Click main photo → lightbox.
 * Lightbox: keyboard ← → arrows, click prev/next buttons, touch swipe.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { trackEvent } from '@/lib/trackEvent'

type Props = {
  urls: string[]
  title: string
  listingId?: string
}

export default function PhotoGallery({ urls, title, listingId }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const prev = useCallback(() => setActiveIndex(i => Math.max(0, i - 1)), [])
  const next = useCallback(() => setActiveIndex(i => Math.min(urls.length - 1, i + 1)), [urls.length])

  // Track photo views whenever the active photo changes (skip index 0 on mount)
  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return }
    if (!listingId) return
    trackEvent(listingId, 'photo_view', {
      photo_index: activeIndex,
      photo_path: urls[activeIndex],
    })
  }, [activeIndex, listingId, urls])

  // Keyboard navigation inside lightbox
  useEffect(() => {
    if (!lightboxOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape')     setLightboxOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxOpen, prev, next])

  if (urls.length === 0) return null

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        {/* Main photo */}
        <div
          onClick={() => setLightboxOpen(true)}
          style={{
            width: '100%', height: '420px', borderRadius: '12px',
            overflow: 'hidden', cursor: 'zoom-in',
            backgroundColor: '#f3f4f6', position: 'relative',
          }}
        >
          <img
            src={urls[activeIndex]}
            alt={`${title} — photo ${activeIndex + 1}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <span style={counterStyle}>
            {activeIndex + 1} / {urls.length}
          </span>
          <span style={hintStyle}>🔍 Click to enlarge</span>
        </div>

        {/* Thumbnails */}
        {urls.length > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', overflowX: 'auto', paddingBottom: '4px' }}>
            {urls.map((url, i) => (
              <button
                key={url}
                onClick={() => setActiveIndex(i)}
                style={{
                  flexShrink: 0, width: '72px', height: '56px', padding: 0,
                  border: `2px solid ${i === activeIndex ? '#6366f1' : 'transparent'}`,
                  borderRadius: '6px', overflow: 'hidden', cursor: 'pointer',
                  opacity: i === activeIndex ? 1 : 0.65,
                  transition: 'opacity 0.15s, border-color 0.15s',
                }}
                aria-label={`View photo ${i + 1}`}
              >
                <img src={url} alt={`Thumbnail ${i + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxOpen && (
        <Lightbox
          urls={urls}
          title={title}
          activeIndex={activeIndex}
          onChangeIndex={setActiveIndex}
          onClose={() => setLightboxOpen(false)}
          prev={prev}
          next={next}
        />
      )}
    </>
  )
}

// ── Lightbox ──────────────────────────────────────────────────────────────

type LightboxProps = {
  urls: string[]
  title: string
  activeIndex: number
  onChangeIndex: (i: number) => void
  onClose: () => void
  prev: () => void
  next: () => void
}

function Lightbox({ urls, title, activeIndex, onClose, prev, next }: LightboxProps) {
  // Touch swipe
  const touchStartX = useRef<number | null>(null)

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 40) dx < 0 ? next() : prev()
    touchStartX.current = null
  }

  return (
    <div
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        backgroundColor: 'rgba(0,0,0,0.94)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'zoom-out',
      }}
    >
      {/* Prev */}
      {activeIndex > 0 && (
        <button onClick={e => { e.stopPropagation(); prev() }}
          style={navBtn('left')} aria-label="Previous photo">‹</button>
      )}

      <img
        src={urls[activeIndex]}
        alt={`${title} — photo ${activeIndex + 1}`}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', userSelect: 'none' }}
      />

      {/* Next */}
      {activeIndex < urls.length - 1 && (
        <button onClick={e => { e.stopPropagation(); next() }}
          style={navBtn('right')} aria-label="Next photo">›</button>
      )}

      {/* Close */}
      <button onClick={onClose} style={{
        position: 'absolute', top: '16px', right: '20px',
        background: 'none', border: 'none', color: 'white',
        fontSize: '2rem', cursor: 'pointer', lineHeight: 1,
      }} aria-label="Close">✕</button>

      {/* Counter */}
      <span style={{
        position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem',
        pointerEvents: 'none',
      }}>
        {activeIndex + 1} / {urls.length}
      </span>

      {/* Swipe hint — only on touch devices */}
      {urls.length > 1 && (
        <span style={{
          position: 'absolute', bottom: '20px', right: '20px',
          color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem',
          pointerEvents: 'none',
        }}>
          swipe or use ← →
        </span>
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────

const counterStyle: React.CSSProperties = {
  position: 'absolute', bottom: '10px', right: '12px',
  backgroundColor: 'rgba(0,0,0,0.55)', color: 'white',
  fontSize: '0.75rem', padding: '3px 10px', borderRadius: '999px',
}

const hintStyle: React.CSSProperties = {
  position: 'absolute', bottom: '10px', left: '12px',
  backgroundColor: 'rgba(0,0,0,0.45)', color: 'white',
  fontSize: '0.7rem', padding: '3px 8px', borderRadius: '999px',
}

function navBtn(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute', [side]: '16px', top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
    fontSize: '3rem', lineHeight: 1, width: '52px', height: '68px',
    borderRadius: '8px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(4px)',
  }
}
