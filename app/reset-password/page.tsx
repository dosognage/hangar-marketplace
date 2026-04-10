'use client'

/**
 * Reset Password page
 *
 * Supabase redirects here after the user clicks the email link.
 * The link contains a token in the URL hash which Supabase's JS client
 * picks up automatically via onAuthStateChange (PASSWORD_RECOVERY event).
 * Once the session is established we let the user set a new password.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'


type Stage = 'waiting' | 'ready' | 'loading' | 'done' | 'error' | 'invalid'

export default function ResetPasswordPage() {
  const router  = useRouter()
  const [stage, setStage]       = useState<Stage>('waiting')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when it detects the reset token in the URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStage('ready')
      }
    })

    // Safety net: if no event fires within 4s the link is invalid/expired
    const timer = setTimeout(() => {
      setStage(s => s === 'waiting' ? 'invalid' : s)
    }, 4000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setStage('loading')

    const { error: err } = await supabase.auth.updateUser({ password })

    if (err) {
      setError(err.message)
      setStage('ready')
      return
    }

    setStage('done')
    setTimeout(() => router.push('/dashboard'), 2500)
  }

  // ── States ────────────────────────────────────────────────────────────────

  if (stage === 'waiting') {
    return (
      <div style={{ maxWidth: '420px', margin: '3rem auto' }}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
            <p style={{ margin: 0, color: '#6b7280' }}>Verifying your reset link…</p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    )
  }

  if (stage === 'invalid') {
    return (
      <div style={{ maxWidth: '420px', margin: '3rem auto' }}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
            <h2 style={{ margin: '0 0 0.5rem' }}>Link expired or invalid</h2>
            <p style={{ margin: '0 0 1.5rem', color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Password reset links expire after 1 hour. Request a new one and try again.
            </p>
            <a href="/forgot-password" style={buttonStyle}>Request a new link</a>
          </div>
        </div>
      </div>
    )
  }

  if (stage === 'done') {
    return (
      <div style={{ maxWidth: '420px', margin: '3rem auto' }}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              backgroundColor: '#dcfce7', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <h2 style={{ margin: '0 0 0.4rem' }}>Password updated!</h2>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
              Redirecting you to your dashboard…
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Main form (stage === 'ready' | 'loading') ─────────────────────────────

  return (
    <div style={{ maxWidth: '420px', margin: '3rem auto' }}>
      <div style={cardStyle}>
        <h1 style={{ margin: '0 0 0.25rem' }}>Set a new password</h1>
        <p style={{ color: '#6b7280', margin: '0 0 1.75rem', fontSize: '0.9rem' }}>
          Choose something strong — at least 8 characters.
        </p>

        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label htmlFor="password" style={labelStyle}>New password</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label htmlFor="confirm" style={labelStyle}>Confirm password</label>
            <input
              id="confirm"
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              style={inputStyle}
            />
          </div>

          <button type="submit" disabled={stage === 'loading'} style={buttonStyle}>
            {stage === 'loading' ? 'Updating…' : 'Update password'}
          </button>
        </form>
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
  display: 'inline-block', padding: '0.7rem',
  backgroundColor: '#111827', color: 'white',
  border: 'none', borderRadius: '6px', fontSize: '1rem',
  fontWeight: '600', cursor: 'pointer', textDecoration: 'none',
  textAlign: 'center',
}
const errorStyle: React.CSSProperties = {
  backgroundColor: '#fef2f2', border: '1px solid #fecaca',
  borderRadius: '6px', padding: '0.75rem 1rem',
  color: '#dc2626', fontSize: '0.875rem', marginBottom: '0.5rem',
}
