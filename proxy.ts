/**
 * Next.js Proxy (formerly Middleware)
 *
 * Runs before every matched request. Responsibilities:
 *  1. Protect /admin  — must be logged in AND email must be in ADMIN_EMAILS
 *  2. Protect /dashboard — must be logged in (any user)
 *  3. Redirect /login and /signup to / if already logged in
 *
 * We decode the JWT payload (base64) to read the user's email without
 * making a network call. We don't verify the signature here — that is
 * handled by Supabase on actual data requests. An attacker with a
 * forged JWT still can't read real data; they'd just see the page shell.
 */

import { NextResponse, type NextRequest } from 'next/server'

const PROJECT_REF = process.env.NEXT_PUBLIC_SUPABASE_URL!
  .split('//')[1]
  .split('.')[0]
const SESSION_COOKIE = `sb-${PROJECT_REF}-auth-token`

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const payload = getSessionPayload(request)
  const userEmail = payload?.email as string | undefined

  // ── /admin (excluding /admin/login) ────────────────────────────────────
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!userEmail) {
      // Not logged in → go to login
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }

    const adminEmails = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)

    if (!adminEmails.includes(userEmail.toLowerCase())) {
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
  matcher: ['/admin/:path*', '/dashboard/:path*', '/login', '/signup'],
}
