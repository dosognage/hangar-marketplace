import Link from 'next/link'

/**
 * Shown after signup when Supabase requires email confirmation.
 * If your Supabase project has "Confirm email" disabled, users are
 * logged in immediately and redirected to /dashboard instead.
 */
export default function ConfirmPage() {
  return (
    <div style={{ maxWidth: '420px', margin: '4rem auto', textAlign: 'center' }}>
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '2.5rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✉️</div>
        <h1 style={{ marginTop: 0 }}>Check your email</h1>
        <p style={{ color: '#6b7280', lineHeight: 1.6 }}>
          We sent a confirmation link to your email address. Click the link to
          activate your account, then come back and sign in.
        </p>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Didn&apos;t get it? Check your spam folder.
        </p>
        <Link
          href="/login"
          style={{
            display: 'inline-block',
            padding: '0.65rem 1.5rem',
            backgroundColor: '#111827',
            color: 'white',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '600',
          }}
        >
          Go to login
        </Link>
      </div>
    </div>
  )
}
