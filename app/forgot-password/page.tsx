'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordReset, type ForgotPasswordState } from '@/app/actions/auth'
import TurnstileWidget from '@/app/components/TurnstileWidget'

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState<ForgotPasswordState, FormData>(
    requestPasswordReset,
    null,
  )

  // After a successful submit we always show the same generic confirmation,
  // regardless of whether the address is registered. Prevents email enumeration.
  if (state?.sent) {
    return (
      <div style={{ maxWidth: '420px', margin: '3rem auto' }}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              backgroundColor: '#dcfce7', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.72a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            <h1 style={{ margin: '0 0 0.4rem', fontSize: '1.3rem' }}>Check your email</h1>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.6 }}>
              If an account exists for <strong style={{ color: '#111827' }}>{state.email}</strong>,
              we just sent it a password reset link. It may take a minute to arrive.
            </p>
          </div>
          <p style={{ margin: '1.25rem 0 0', textAlign: 'center', fontSize: '0.8rem', color: '#9ca3af' }}>
            <Link href="/login" style={{ color: '#6366f1', textDecoration: 'none' }}>Back to sign in</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '420px', margin: '3rem auto' }}>
      <div style={cardStyle}>
        <h1 style={{ margin: '0 0 0.25rem' }}>Reset your password</h1>
        <p style={{ color: '#6b7280', margin: '0 0 1.75rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Enter the email you signed up with and we&apos;ll send you a reset link.
        </p>

        {state?.error && (
          <div style={errorStyle}>{state.error}</div>
        )}

        <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label htmlFor="email" style={labelStyle}>Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={state?.email ?? ''}
              placeholder="you@example.com"
              style={inputStyle}
            />
          </div>

          <TurnstileWidget />

          <button type="submit" disabled={isPending} style={buttonStyle}>
            {isPending ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
          <Link href="/login" style={{ color: '#6366f1', textDecoration: 'none' }}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  backgroundColor: 'white', border: '1px solid #e5e7eb',
  borderRadius: '12px', padding: '2rem',
  boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
}
const labelStyle: React.CSSProperties = {
  fontSize: '0.875rem', fontWeight: '600', color: '#374151',
}
const inputStyle: React.CSSProperties = {
  padding: '0.6rem 0.75rem', border: '1px solid #d1d5db',
  borderRadius: '6px', fontSize: '1rem', color: '#111827',
  backgroundColor: 'white', outline: 'none',
}
const buttonStyle: React.CSSProperties = {
  padding: '0.7rem', backgroundColor: '#111827', color: 'white',
  border: 'none', borderRadius: '6px', fontSize: '1rem',
  fontWeight: '600', cursor: 'pointer', marginTop: '0.25rem',
}
const errorStyle: React.CSSProperties = {
  backgroundColor: '#fef2f2', border: '1px solid #fecaca',
  borderRadius: '6px', padding: '0.75rem 1rem',
  color: '#dc2626', fontSize: '0.875rem', marginBottom: '0.5rem',
}
