'use client'

/**
 * PhotoGallery
 *
 * Shows a large "active" photo with clickable thumbnails below.
 * Clicking a thumbnail makes it the active photo.
 * Clicking the main photo opens it full-screen in a lightbox overlay.
 */

import { useState } from 'react'

type Props = {
  urls: string[]
  title: string
}

export default function PhotoGallery({ urls, title }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  if (urls.length === 0) return null

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        {/* Main photo */}
        <div
          onClick={() => setLightboxOpen(true)}
          style={{
            width: '100%',
            height: '420px',
            borderRadius: '12px',
            overflow: 'hidden',
            cursor: 'zoom-in',
            backgroundColor: '#f3f4f6',
            position: 'relative',
          }}
        >
          <img
            src={urls[activeIndex]}
            alt={`${title} — photo ${activeIndex + 1}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {/* Photo counter */}
          <span style={{
            position: 'absolute', bottom: '10px', right: '12px',
            backgroundColor: 'rgba(0,0,0,0.55)', color: 'white',
            fontSize: '0.75rem', padding: '3px 10px', borderRadius: '999px',
          }}>
            {activeIndex + 1} / {urls.length}
          </span>
          {/* Zoom hint */}
          <span style={{
            position: 'absolute', bottom: '10px', left: '12px',
            backgroundColor: 'rgba(0,0,0,0.45)', color: 'white',
            fontSize: '0.7rem', padding: '3px 8px', borderRadius: '999px',
          }}>
            🔍 Click to enlarge
          </span>
        </div>

        {/* Thumbnails */}
        {urls.length > 1 && (
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginTop: '0.5rem',
            overflowX: 'auto',
            paddingBottom: '4px',
          }}>
            {urls.map((url, i) => (
              <button
                key={url}
                onClick={() => setActiveIndex(i)}
                style={{
                  flexShrink: 0,
                  width: '72px',
                  height: '56px',
                  padding: 0,
                  border: `2px solid ${i === activeIndex ? '#6366f1' : 'transparent'}`,
                  borderRadius: '6px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  opacity: i === activeIndex ? 1 : 0.65,
                  transition: 'opacity 0.15s, border-color 0.15s',
                }}
                aria-label={`View photo ${i + 1}`}
              >
                <img
                  src={url}
                  alt={`Thumbnail ${i + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox overlay */}
      {lightboxOpen && (
        <div
          onClick={() => setLightboxOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            backgroundColor: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          {/* Prev button */}
          {activeIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setActiveIndex(activeIndex - 1) }}
              style={navButtonStyle('left')}
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}

          <img
            src={urls[activeIndex]}
            alt={`${title} — photo ${activeIndex + 1}`}
            style={{
              maxWidth: '90vw', maxHeight: '90vh',
              objectFit: 'contain', borderRadius: '8px',
            }}
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next button */}
          {activeIndex < urls.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setActiveIndex(activeIndex + 1) }}
              style={navButtonStyle('right')}
              aria-label="Next photo"
            >
              ›
            </button>
          )}

          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            style={{
              position: 'absolute', top: '16px', right: '20px',
              background: 'none', border: 'none', color: 'white',
              fontSize: '2rem', cursor: 'pointer', lineHeight: 1,
            }}
            aria-label="Close"
          >
            ✕
          </button>

          {/* Counter */}
          <span style={{
            position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem',
          }}>
            {activeIndex + 1} / {urls.length}
          </span>
        </div>
      )}
    </>
  )
}

function navButtonStyle(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute',
    [side]: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    color: 'white',
    fontSize: '3rem',
    lineHeight: 1,
    width: '48px',
    height: '64px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
}
