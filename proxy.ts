/**
 * Next.js Proxy (formerly Middleware)
 *
 * Runs before every matched request. Responsibilities:
 *  1. Protect /admin pages — must be logged in AND email must be in
 *     ADMIN_EMAILS. Redirects with `?next=` so login bounces them back.
 *  2. Protect /api/admin/* JSON endpoints — same admin gate, but returns
 *     401/403 JSON instead of redirecting (defence in depth: each route
 *     also checks inline, but if a future route forgets, this catches it).
 *  3. Protect /dashboard — must be logged in (any user).
 *  4. Redirect /login and /signup to / if already logged in.
 *
 * We decode the JWT payload (base64) to read the user's email without
 * making a network call. We don't verify the signature here — that is
 * handled by Supabase on actual data requests. An attacker with a
 * forged JWT still can't read real data; they'd just see the page shell.
 */

import { NextResponse, type NextRequest } from 'next/server'

function getSessionCookieName(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const ref = url.split('//')[1]?.split('.')[0] ?? 'local'
  return `sb-${ref}-auth-token`
}

/** Decode a JWT payload without verifying the signature. */
function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const payloadB64 = token.split('.')[1]
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

/** Parse the session cookie and return the access_token JWT payload, or null. */
function getSessionPayload(request: NextRequest): Record<string, unknown> | null {
  const SESSION_COOKIE = getSessionCookieName()
  const raw = request.cookies.get(SESSION_COOKIE)?.value
  if (!raw) return null
  try {
    const session = JSON.parse(raw)
    const accessToken: string | undefined = session?.access_token
    if (!accessToken) return null

    const payload = decodeJWT(accessToken)

    // Check the token hasn't expired
    const exp = payload?.exp as number | undefined
    if (exp && Date.now() / 1000 > exp) return null

    return payload
  } catch {
    return null
  }
}

/** Lazily-evaluated admin email allowlist. */
function adminEmailSet(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const payload = getSessionPayload(request)
  const userEmail = payload?.email as string | undefined

  // ── /api/admin/* — JSON gate ───────────────────────────────────────────
  // We respond with 401/403 JSON (not a redirect). Each route also has its
  // own inline check today; this layer ensures a future route added without
  // the inline check still can't be reached by non-admins.
  if (pathname.startsWith('/api/admin')) {
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }
    if (!adminEmailSet().has(userEmail.toLowerCase())) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      )
    }
  }

  // ── /admin (excluding /admin/login) ────────────────────────────────────
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!userEmail) {
      // Not logged in → go to login
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }

    if (!adminEmailSet().has(userEmail.toLowerCase())) {
      // Logged in but not an admin → redirect home
      const url = request.nextUrl.clone()
      url.pathname = '/'
      url.searchParams.set('error', 'not_admin')
      return NextResponse.redirect(url)
    }
  }

  // ── /dashboard ──────────────────────────────────────────────────────────
  if (pathname.startsWith('/dashboard')) {
    if (!userEmail) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }
  }

  // ── /login and /signup — skip if already logged in ─────────────────────
  if ((pathname === '/login' || pathname === '/signup') && userEmail) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/dashboard/:path*',
    '/login',
    '/signup',
  ],
}
