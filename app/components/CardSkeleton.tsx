/**
 * CardSkeleton — animated placeholder for a listing card while loading.
 */
export default function CardSkeleton() {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '2px solid transparent',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      overflow: 'hidden',
    }}>
      {/* Photo placeholder */}
      <div style={shimmer({ height: '130px' })} />
      <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        {/* Price + badge row */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={shimmer({ width: '100px', height: '18px', borderRadius: '4px' })} />
          <div style={shimmer({ width: '64px', height: '18px', borderRadius: '999px' })} />
        </div>
        {/* Title */}
        <div style={shimmer({ width: '85%', height: '14px', borderRadius: '4px' })} />
        <div style={shimmer({ width: '60%', height: '12px', borderRadius: '4px' })} />
        {/* Specs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.15rem' }}>
          <div style={shimmer({ width: '72px', height: '12px', borderRadius: '4px' })} />
          <div style={shimmer({ width: '60px', height: '12px', borderRadius: '4px' })} />
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
    ...extra,
  }
}
