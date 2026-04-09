import CardSkeleton from '@/app/components/CardSkeleton'

/**
 * loading.tsx — shown by Next.js while the home page Server Component
 * is fetching data (e.g. after a filter search navigation).
 *
 * Mirrors the browse page layout: search bar placeholder + skeleton cards
 * overlaid on a grey map background.
 */
export default function BrowseLoading() {
  return (
    <div style={{
      margin: '-2rem',
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100dvh - var(--header-h, 60px))',
      overflow: 'hidden',
    }}>
      {/* Search bar skeleton */}
      <div style={{
        padding: '1rem 2rem',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f8f8f8',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
      }}>
        <div style={shimmer({ flex: 1, height: '38px', borderRadius: '6px' })} />
        <div style={shimmer({ width: '90px', height: '38px', borderRadius: '6px' })} />
        <div style={shimmer({ width: '70px', height: '38px', borderRadius: '6px' })} />
      </div>

      {/* Split view skeleton */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Card panel */}
        <div style={{
          width: '400px',
          backgroundColor: 'rgba(255,255,255,0.97)',
          boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
          padding: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          overflowY: 'hidden',
        }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>

        {/* Map placeholder */}
        <div style={{ flex: 1, backgroundColor: '#e5e7eb' }} />
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
