'use client'

/**
 * Login page
 * Uses React 19's useActionState to call the login Server Action and
 * show errors without a full page reload.
 */

import { useActionState, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { login, type AuthState } from '@/app/actions/auth'

function LoginForm() {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    login,
    null
  )
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'

  // Preserve the email the user typed so it stays in the field on error
  const submittedEmail = state?.email ?? ''

  return (
    <div style={cardStyle}>
      <h1 style={{ marginTop: 0, marginBottom: '0.25rem' }}>Sign in</h1>
      <p style={{ color: '#6b7280', marginTop: 0, marginBottom: '1.5rem' }}>
        Welcome back to Hangar Marketplace
      </p>

      {state?.error && (
        <div role="alert" data-testid="login-error" style={errorStyle}>{state.error}</div>
      )}

      <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
            defaultValue={submittedEmail}
            key={submittedEmail}
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
