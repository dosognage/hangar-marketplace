'use client'

/**
 * Login page
 * Posts the form to /api/auth/login with fetch. On success it does a full
 * page load of the destination; on failure it shows the error in place.
 * Why not a Server Action + redirect(): see lib/password-login.ts.
 */

import { useState, Suspense, type FormEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { safeNextPath } from '@/lib/safe-redirect'
import TurnstileWidget from '@/app/components/TurnstileWidget'

function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const searchParams = useSearchParams()
  // Sanitize on the client too — the server also sanitizes (so an
  // attacker can't bypass us by hand-crafting the form), but cleaning the
  // value here keeps the hidden input + "Create one" link href safe.
  const next = safeNextPath(searchParams.get('next'))

  // Reset Turnstile after every failed attempt. Tokens are single-use; on a
  // bad-password retry the widget UI still shows ✓ but Cloudflare rejects
  // the consumed token. Remounting via key bump gives the next submit a
  // fresh token. See signup/page.tsx for the full rationale.
  const [turnstileKey, setTurnstileKey] = useState(0)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isPending) return
    setIsPending(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        body: new FormData(e.currentTarget),
        credentials: 'same-origin',
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok && typeof body.redirectTo === 'string') {
        // Signed in. A full page load (not a client-side transition) so the
        // signed-in layout renders from scratch, the same as a reload.
        // isPending stays true so the button holds "Signing in…".
        window.location.assign(body.redirectTo)
        return
      }
      setError(typeof body.error === 'string' ? body.error : 'Something went wrong signing in. Please try again.')
    } catch {
      setError('Could not reach Hangar Marketplace. Check your connection and try again.')
    }
    setIsPending(false)
    setTurnstileKey(k => k + 1)
  }

  return (
    <div style={cardStyle}>
      <h1 style={{ marginTop: 0, marginBottom: '0.25rem' }}>Sign in</h1>
      <p style={{ color: '#6b7280', marginTop: 0, marginBottom: '1.5rem' }}>
        Welcome back to Hangar Marketplace
      </p>

      {error && (
        <div role="alert" data-testid="login-error" style={errorStyle}>{error}</div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Pass the redirect destination through the form */}
        <input type="hidden" name="next" value={next} />

        <div style={fieldStyle}>
          <label htmlFor="email" style={labelStyle}>Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            style={inputStyle}
          />
        </div>

        <div style={fieldStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <label htmlFor="password" style={labelStyle}>Password</label>
            <Link href="/forgot-password" style={{ fontSize: '0.8rem', color: '#6366f1', textDecoration: 'none' }}>
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            style={inputStyle}
          />
        </div>

        {/* Bot-protection gate. Without this, the login endpoint is wide open
            to credential-stuffing — leaked-elsewhere email/password pairs
            tested at scale. Turnstile makes that orders of magnitude more
            expensive without inconveniencing real users (most pass invisibly,
            a tiny fraction see a one-click challenge). */}
        <TurnstileWidget key={turnstileKey} />

        <button type="submit" disabled={isPending} style={buttonStyle}>
          {isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p style={{ marginTop: '1.5rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
        Don&apos;t have an account?{' '}
        <Link
          href={next && next !== '/' ? `/signup?next=${encodeURIComponent(next)}` : '/signup'}
          style={{ color: '#6366f1', textDecoration: 'none', fontWeight: '500' }}
        >
          Create one
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div style={{ maxWidth: '420px', margin: '3rem auto' }}>
      <Suspense fallback={<div style={cardStyle}><p>Loading…</p></div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '2rem',
  boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
}

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#374151',
}

const inputStyle: React.CSSProperties = {
  padding: '0.6rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '1rem',
  outline: 'none',
  color: '#111827',
  backgroundColor: 'white',
}

const buttonStyle: React.CSSProperties = {
  padding: '0.7rem',
  backgroundColor: '#111827',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '1rem',
  fontWeight: '600',
  cursor: 'pointer',
  marginTop: '0.5rem',
}

const errorStyle: React.CSSProperties = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '6px',
  padding: '0.75rem 1rem',
  color: '#dc2626',
  fontSize: '0.875rem',
  marginBottom: '1rem',
}
