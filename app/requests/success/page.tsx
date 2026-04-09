import Link from 'next/link'

export default function RequestSuccessPage() {
  return (
    <div style={{ maxWidth: '520px', margin: '4rem auto', textAlign: 'center' }}>
      <div style={{
        width: '64px', height: '64px', borderRadius: '50%',
        backgroundColor: '#dcfce7', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 1.5rem',
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
          stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem' }}>Request posted!</h1>
      <p style={{ color: '#6b7280', margin: '0 0 2rem', lineHeight: 1.6 }}>
        Your hangar request is now live on the board. Hangar owners will
        contact you directly at the email you provided when they have
        matching space available.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/requests" style={{
          display: 'inline-block', padding: '0.65rem 1.5rem',
          backgroundColor: '#111827', color: 'white',
          borderRadius: '7px', textDecoration: 'none',
          fontWeight: '600', fontSize: '0.9rem',
        }}>
          View all requests
        </Link>
        <Link href="/requests/new" style={{
          display: 'inline-block', padding: '0.65rem 1.5rem',
          backgroundColor: 'white', color: '#374151',
          border: '1px solid #d1d5db', borderRadius: '7px',
          textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem',
        }}>
          Post another
        </Link>
      </div>
    </div>
  )
}
