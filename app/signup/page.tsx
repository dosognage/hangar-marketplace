'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signup, type AuthState } from '@/app/actions/auth'

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    signup,
    null
  )
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'

  return (
    <div style={{ maxWidth: '420px', margin: '3rem auto' }}>
      <div style={cardStyle}>
        <h1 style={{ marginTop: 0, marginBottom: '0.25rem' }}>Create account</h1>
        <p style={{ color: '#6b7280', marginTop: 0, marginBottom: '1.5rem' }}>
          List your hangar on the marketplace
        </p>

        {state?.error && (
          <div style={errorStyle}>{state.error}</div>
        )}

        <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input type="hidden" name="next" value={next} />
          <div style={fieldStyle}>
            <label htmlFor="name" style={labelStyle}>Full name</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Jane Smith"
              defaultValue={state?.name ?? ''}
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label htmlFor="email" style={labelStyle}>Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              defaultValue={state?.email ?? ''}
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label htmlFor="password" style={labelStyle}>Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Min. 8 characters"
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label htmlFor="confirmPassword" style={labelStyle}>Confirm password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginTop: '0.25rem' }}>
            <input
              id="marketingConsent"
              name="marketingConsent"
              type="checkbox"
              defaultChecked={false}
              style={{ marginTop: '2px', accentColor: '#111827', flexShrink: 0 }}
            />
            <label htmlFor="marketingConsent" style={{ fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.5, cursor: 'pointer' }}>
              Send me occasional updates on new hangar listings, aviation news, and Hangar Marketplace announcements. You can unsubscribe any time.
            </label>
          </div>

          <button type="submit" disabled={isPending} style={buttonStyle}>
            {isPending ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
          Already have an account?{' '}
          <Link
            href={next && next !== '/' ? `/login?next=${encodeURIComponent(next)}` : '/login'}
            style={{ color: '#6366f1', textDecoration: 'none', fontWeight: '500' }}
          >
            Sign in
          </Link>
        </p>
      </div>
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
