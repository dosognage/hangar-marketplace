import CardSkeleton from '@/app/components/CardSkeleton'

/**
 * loading.tsx: shown while the Browse page (/) Server Component fetches
 * its listings, e.g. on first load or after a filter search.
 *
 * Lives in the (browse) route group so only Browse gets this skeleton.
 * At the app root it was the fallback for every page, so opening Saved
 * or a listing flashed a map skeleton first.
 *
 * Mirrors the real Browse layout element for element (page.tsx +
 * SplitView + MobileSearchBar) and reuses their class names, so the
 * mobile rules in globals.css apply the same way:
 *   desktop: search strip on top, 400px card column over the map.
 *   mobile (<=640px): full-screen map, floating search pill, and a
 *     bottom sheet peeking with the first card. Without the shared
 *     classes the desktop shape rendered on phones, pushed off the left
 *     edge by the -2rem margin and too wide at 400px.
 */
export default function BrowseLoading() {
  return (
    <div className="home-fullbleed" style={{
      margin: '-2rem',
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100dvh - var(--header-h, 60px))',
      overflow: 'hidden',
    }}>
      {/* Desktop search strip (hidden on mobile by .desktop-search-bar) */}
      <div className="desktop-search-bar" style={{
        padding: '1rem 2rem 0.75rem',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f8f8f8',
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={shimmer({ flex: 1, height: '38px', borderRadius: '6px' })} />
          <div style={shimmer({ width: '90px', height: '38px', borderRadius: '6px' })} />
          <div style={shimmer({ width: '70px', height: '38px', borderRadius: '6px' })} />
        </div>
        {/* Filter row, so the page doesn't jump when the real filters land */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem', marginTop: '0.75rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={shimmer({ width: '60%', height: '10px', borderRadius: '4px' })} />
              <div style={shimmer({ height: '38px', borderRadius: '6px' })} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          {/* Map placeholder, full bleed behind everything */}
          <div style={{ position: 'absolute', inset: 0, backgroundColor: '#e5e7eb' }} />

          {/* Mobile floating search pill (shown only on mobile) */}
          <div className="mobile-search-bar-wrapper">
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '12px',
              right: '12px',
              height: '54px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '0 16px',
              backgroundColor: 'white',
              borderRadius: '32px',
              boxShadow: '0 2px 24px rgba(0,0,0,0.3)',
            }}>
              <div style={shimmer({ width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0 })} />
              <div style={shimmer({ width: '60%', height: '14px', borderRadius: '4px' })} />
            </div>
          </div>

          {/* Cards: desktop left column, mobile bottom sheet (peek) */}
          <div className="split-cards-panel" style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '400px',
            overflowY: 'hidden',
            backgroundColor: 'rgba(255,255,255,0.97)',
            boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            padding: '0.75rem',
          }}>
            {/* Sheet handle (mobile only, via .sheet-drag-handle) */}
            <div className="sheet-drag-handle" aria-hidden="true">
              <div className="sheet-handle-pill" />
              <div className="sheet-handle-row">
                <div style={shimmer({ width: '96px', height: '14px', borderRadius: '4px' })} />
              </div>
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}><CardSkeleton /></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function shimmer(extra: React.CSSProperties): React.CSSProperties {
  return {
    backgroundColor: '#e5e7eb',
    backgroundImage: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
    backgroundSize: '400% 100%',
    animation: 'shimmer 1.4s ease infinite',
    borderRadius: '8px',
    ...extra,
  }
}
