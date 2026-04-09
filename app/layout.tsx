import Link from 'next/link'
import './globals.css'
import { createServerClient } from '@/lib/supabase-server'
import ProfileMenu from '@/app/components/ProfileMenu'
import ToastProvider from '@/app/components/ToastProvider'
import ProgressBar from '@/app/components/ProgressBar'
import SavedCountProvider from '@/app/components/SavedCountProvider'
import NewsletterSignup from '@/app/components/NewsletterSignup'

export const metadata = {
  title: 'Hangar Marketplace',
  description: 'Marketplace for airplane hangar listings',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Wrap the Supabase auth check in try-catch so the layout never crashes
  // during Next.js build-time prerender of system routes like /_not-found.
  // Those routes have no request context (no cookies, env vars may be
  // unavailable), so we fall back to the logged-out state gracefully.
  let user: Awaited<ReturnType<Awaited<ReturnType<typeof createServerClient>>['auth']['getUser']>>['data']['user'] = null
  let isAdmin = false
  let initialSavedCount = 0

  try {
    const supabase = await createServerClient()
    const { data: { user: u } } = await supabase.auth.getUser()
    user = u

    const adminEmails = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)

    isAdmin = Boolean(user?.email && adminEmails.includes(user.email.toLowerCase()))

    if (user) {
      const { count } = await supabase
        .from('saved_listings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
      initialSavedCount = count ?? 0
    }
  } catch {
    // Build-time prerender: env vars / cookies not available → show logged-out nav
  }

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#f8f8f8',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
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
                <Link href="/pricing" style={navLinkStyle}>Pricing</Link>
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
            <main style={{ flex: 1, maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '2rem', boxSizing: 'border-box' }}>
              {children}
            </main>
          </ToastProvider>

          {/* ── Site footer ─────────────────────────────────────────────── */}
          <footer style={{
            backgroundColor: '#111827',
            borderTop: '1px solid #1f2937',
            padding: '2rem 2rem 1.5rem',
          }}>
            <div style={{
              maxWidth: '1100px',
              margin: '0 auto',
            }}>

              {/* ── Top row: newsletter + nav columns ───────────────────── */}
              <div style={{
                display: 'flex',
                gap: '3rem',
                flexWrap: 'wrap',
                marginBottom: '1.75rem',
                alignItems: 'flex-start',
              }}>
                {/* Newsletter */}
                <div style={{ flex: '1 1 260px', minWidth: '220px' }}>
                  <p style={{ margin: '0 0 0.75rem', color: '#e5e7eb', fontSize: '0.825rem', fontWeight: '700' }}>
                    ✈ Hangar Marketplace
                  </p>
                  <p style={{ margin: '0 0 1rem', color: '#6b7280', fontSize: '0.75rem', lineHeight: 1.6 }}>
                    The easiest way to find, list, and lease aviation hangar space across the US.
                  </p>
                  <NewsletterSignup source="footer_form" compact />
                </div>

                {/* Nav columns */}
                <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
                  <FooterCol title="Platform">
                    <FooterLink href="/">Browse hangars</FooterLink>
                    <FooterLink href="/submit">List a hangar</FooterLink>
                    <FooterLink href="/requests">Hangar requests</FooterLink>
                    <FooterLink href="/requests/new">Post a request</FooterLink>
                    <FooterLink href="/pricing">Pricing</FooterLink>
                  </FooterCol>
                  <FooterCol title="Company">
                    <FooterLink href="/privacy">Privacy Policy</FooterLink>
                    <FooterLink href="/unsubscribe">Unsubscribe</FooterLink>
                    <FooterLink href="/apply-broker">Broker verification</FooterLink>
                  </FooterCol>
                  <FooterCol title="Contact us">
                    <a href="tel:+19203858284" style={footerContactStyle}>(920) 385-8284</a>
                    <a href="mailto:andre.dosogne@outlook.com" style={footerContactStyle}>andre.dosogne@outlook.com</a>
                  </FooterCol>
                </div>
              </div>

              {/* ── Bottom bar: copyright ────────────────────────────────── */}
              <div style={{
                borderTop: '1px solid #1f2937',
                paddingTop: '1rem',
              }}>
                <span style={{ color: '#4b5563', fontSize: '0.72rem' }}>
                  © {new Date().getFullYear()} Hangar Marketplace · All rights reserved ·{' '}
                  <Link href="/privacy" style={{ color: '#4b5563', textDecoration: 'none' }}>Privacy Policy</Link>
                </span>
              </div>

            </div>
          </footer>

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

const footerContactStyle: React.CSSProperties = {
  display: 'block',
  color: '#9ca3af',
  fontSize: '0.775rem',
  textDecoration: 'none',
  lineHeight: 1.8,
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ margin: '0 0 0.6rem', color: '#4b5563', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
        {children}
      </div>
    </div>
  )
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={{ color: '#9ca3af', fontSize: '0.775rem', textDecoration: 'none', lineHeight: 1.8 }}>
      {children}
    </Link>
  )
}
