import Link from 'next/link'
import './globals.css'
import { createServerClient } from '@/lib/supabase-server'
import LogoutButton from '@/app/components/LogoutButton'

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
          style={{
            backgroundColor: '#111827',
            padding: '1rem 2rem',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              maxWidth: '1100px',
              margin: '0 auto',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            {/* Brand */}
            <Link
              href="/"
              style={{
                color: 'white',
                textDecoration: 'none',
                fontWeight: 'bold',
                fontSize: '1.1rem',
              }}
            >
              Hangar Marketplace
            </Link>

            {/* Nav links */}
            <div
              className="nav-links"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <Link href="/" style={navLinkStyle}>
                Browse
              </Link>

              <Link href="/submit" style={navLinkStyle}>
                List a Hangar
              </Link>

              {user ? (
                <>
                  <Link href="/dashboard" style={navLinkStyle}>
                    My Listings
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" style={navLinkStyle}>
                      Admin
                    </Link>
                  )}
                  <span className="nav-email" style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                    {user.email}
                  </span>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link href="/login" style={navLinkStyle}>
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    style={{
                      ...navLinkStyle,
                      backgroundColor: '#6366f1',
                      padding: '0.3rem 0.85rem',
                      borderRadius: '5px',
                      fontWeight: '600',
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
  color: 'white',
  textDecoration: 'none',
  fontSize: '0.9rem',
}
