import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Email confirmed',
  description: 'Your Hangar Marketplace email address is confirmed.',
  robots: { index: false, follow: false },
}

/**
 * Landing page for people who confirmed their email from the mobile app.
 *
 * The confirmation link opens in a browser, so the session created by
 * /auth/callback lives in the browser and not in the app. The app needs
 * a real sign-in, which is what this page asks for.
 *
 * Web signups skip this page; /auth/callback drops them on the site
 * already signed in.
 */
export default function EmailConfirmedPage() {
  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', padding: '4rem 1.25rem', lineHeight: 1.7, textAlign: 'center' }}>
      <div style={{
        width: '56px', height: '56px', margin: '0 auto 1.5rem',
        borderRadius: '50%', backgroundColor: '#dcfce7',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.6rem',
      }}>
        ✓
      </div>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.6rem', color: '#111827' }}>
        Email confirmed
      </h1>

      <p style={{ color: '#4b5563', fontSize: '1rem', marginBottom: '2rem' }}>
        Your account is ready. Open the Hangar Marketplace app and sign in
        to start browsing airport property.
      </p>

      <div style={{
        padding: '1rem 1.25rem', backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb', borderRadius: '10px',
        fontSize: '0.9rem', color: '#6b7280', marginBottom: '2rem',
      }}>
        Signed up on the website instead? You are already signed in there.
      </div>

      <p style={{ fontSize: '0.9rem' }}>
        <Link href="/" style={{ color: '#111827', fontWeight: 700, textDecoration: 'none' }}>
          Go to Hangar Marketplace →
        </Link>
      </p>
    </div>
  )
}
