import Link from 'next/link'
import './globals.css'
import { createServerClient } from '@/lib/supabase-server'
import ProfileMenu from '@/app/components/ProfileMenu'
import ToastProvider from '@/app/components/ToastProvider'
import ProgressBar from '@/app/components/ProgressBar'
import SavedCountProvider from '@/app/components/SavedCountProvider'

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
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  const isAdmin = user?.email && adminEmails.includes(user.email.toLowerCase())

  // Server-fetch the initial saved count so SSR renders the correct number.
  // After hydration, SavedCountProvider keeps it live via React state — no
  // refresh needed when the user saves/unsaves from any page.
  let initialSavedCount = 0
  if (user) {
    const { count } = await supabase
      .from('saved_listings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    initialSavedCount = count ?? 0
  }

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#f8f8f8',
        }}
      >
        {/*
          SavedCountProvider wraps the ENTIRE body so that both:
            • ProfileMenu (in the header) — reads the live count
            • SplitView / FavoriteButton (in pages) — writes to it
          share the exact same context instance.

          ToastProvider is nested inside so toasts can appear on top of
          everything, including the progress bar.
        */}
        <SavedCountProvider initialCount={initialSavedCount}>
          <ProgressBar />

          <header
            className="site-header"
            style={{
              backgroundColor: '#1a3a5c',
              borderBottom: '1px solid #254e7a',
              boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            }}
          >
            <nav className="nav-inner">
              {/* Brand / Logo */}
              <Link
                href="/"
                className="nav-logo"
                style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}
              >
                <svg width="32" height="34" viewBox="0 0 32 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 14 L16 2 L30 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
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

              {/* Secondary nav links */}
              <div className="nav-links">
                <Link href="/" style={navLinkStyle}>Browse</Link>
                <Link href="/requests" style={navLinkStyle}>Requests</Link>
                <Link href="/submit" style={navLinkStyle}>List a Hangar</Link>
              </div>

              {/* Auth / profile */}
              <div className="nav-auth">
                {user ? (
                  <ProfileMenu
                    displayName={
                      (user.user_metadata?.full_name as string | undefined)?.split(' ')[0]
                      ?? user.email!.split('@')[0]
                    }
                    isAdmin={!!isAdmin}
                  />
                ) : (
                  <>
                    <Link href="/login" style={navLinkStyle}>Sign in</Link>
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

          <ToastProvider>
            <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem' }}>
              {children}
            </main>
          </ToastProvider>
        </SavedCountProvider>
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
