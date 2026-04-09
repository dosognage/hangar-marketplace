import Link from 'next/link'
import './globals.css'
import { createServerClient } from '@/lib/supabase-server'
import ProfileMenu from '@/app/components/ProfileMenu'

export const metadata = {
  title: 'Hangar Marketplace',
  description: 'Marketplace for airplane hangar listings',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Read the session cookie to determine who (if anyone) is logged in.
  // This works in Server Components because we're only reading cookies,
  // not writing them.
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  const isAdmin =
    user?.email && adminEmails.includes(user.email.toLowerCase())

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#f8f8f8',
        }}
      >
        <header
          className="site-header"
          style={{
            backgroundColor: '#1a3a5c',
            borderBottom: '1px solid #254e7a',
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          }}
        >
          <nav className="nav-inner">
            {/* Brand / Logo — row 1 left */}
            <Link
              href="/"
              className="nav-logo"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                textDecoration: 'none',
              }}
            >
              {/* Hangar icon: roofline + airplane */}
              <svg width="32" height="34" viewBox="0 0 32 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Roof — explicitly centered: left=2, tip=16, right=30 */}
                <path d="M2 14 L16 2 L30 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                {/* Airplane — centered on x=16 */}
                <path d="M16 8.5a2 2 0 0 0-2 2V17L2 23.5V26l12-3.5V28l-2.5 2V32L16 30.5l4.5 1.5v-2L18 28v-5.5l12 3.5V23.5L18 17v-6.5a2 2 0 0 0-2-2z" fill="white"/>
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                <span style={{ color: 'white', fontWeight: '700', fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                  Hangar Marketplace
                </span>
                <span style={{ color: '#93c5fd', fontSize: '0.65rem', fontWeight: '500', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Aviation Properties
                </span>
              </div>
            </Link>

            {/* Secondary nav links — inline on desktop, row 2 on mobile */}
            <div className="nav-links">
              <Link href="/" style={navLinkStyle}>
                Browse
              </Link>
              <Link href="/submit" style={navLinkStyle}>
                List a Hangar
              </Link>
            </div>

            {/* Auth / profile — far right on desktop, row 1 right on mobile */}
            <div className="nav-auth">
              {user ? (
                <ProfileMenu
                  displayName={
                    (user.user_metadata?.full_name as string | undefined)
                      ?.split(' ')[0]
                    ?? user.email!.split('@')[0]
                  }
                  isAdmin={!!isAdmin}
                />
              ) : (
                <>
                  <Link href="/login" style={navLinkStyle}>
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    style={{
                      ...navLinkStyle,
                      backgroundColor: '#2563eb',
                      padding: '0.4rem 1rem',
                      borderRadius: '6px',
                      fontWeight: '600',
                      marginLeft: '0.25rem',
                    }}
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </nav>
        </header>

        <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem' }}>
          {children}
        </main>
      </body>
    </html>
  )
}

const navLinkStyle: React.CSSProperties = {
  color: '#e2e8f0',
  textDecoration: 'none',
  fontSize: '0.875rem',
  fontWeight: '500',
  padding: '0.4rem 0.65rem',
  borderRadius: '6px',
  transition: 'background-color 0.15s',
}
