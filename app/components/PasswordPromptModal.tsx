'use client'

/**
 * PasswordPromptModal — reusable re-auth prompt for sensitive admin actions.
 *
 * Replaces window.prompt() because Safari silently blocks repeated prompts
 * (e.g. when clicking the same admin button twice within a tab session),
 * leaving the action to fall through with no password and no UX feedback.
 *
 * Usage:
 *   <PasswordPromptModal
 *     open={pending !== null}
 *     title="Comp 30-day sponsorship"
 *     description="Re-enter your password to confirm."
 *     onSubmit={async (pw) => { await api(...); }}
 *     onCancel={() => setPending(null)}
 *   />
 *
 * The component handles its own loading + error state. onSubmit should
 * throw a friendly Error to surface a message inline; otherwise it closes
 * the modal on resolved success.
 */

import { useEffect, useState } from 'react'

type Props = {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  onSubmit: (password: string) => Promise<void>
  onCancel: () => void
}

export default function PasswordPromptModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  onSubmit,
  onCancel,
}: Props) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state whenever the modal opens fresh
  useEffect(() => {
    if (open) {
      setPassword('')
      setError(null)
      setBusy(false)
    }
  }, [open])

  // ESC closes the modal (unless we're mid-submit)
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onCancel])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password) {
      setError('Please enter your password.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmit(password)
      // success — parent should close us
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <div
      onClick={() => !busy && onCancel()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'white', borderRadius: '12px',
          padding: '1.5rem 1.5rem 1.25rem',
          width: '100%', maxWidth: '420px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
        }}
      >
        <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
          {title}
        </h2>
        {description && (
          <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.5 }}>
            {description}
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            autoFocus
            required
            placeholder="Your current password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={busy}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '0.6rem 0.75rem',
              border: error ? '1px solid #f87171' : '1px solid #d1d5db',
              borderRadius: '7px', fontSize: '0.95rem',
              outline: 'none', color: '#111827', backgroundColor: 'white',
            }}
          />
          {error && (
            <p role="alert" data-testid="password-modal-error" style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#dc2626' }}>
              {error}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              style={{
                padding: '0.55rem 1rem', backgroundColor: 'white',
                border: '1px solid #d1d5db', borderRadius: '7px',
                fontSize: '0.875rem', fontWeight: 500, color: '#374151',
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !password}
              style={{
                padding: '0.55rem 1.1rem', backgroundColor: '#1a3a5c',
                border: 'none', borderRadius: '7px', color: 'white',
                fontSize: '0.875rem', fontWeight: 700,
                cursor: busy || !password ? 'not-allowed' : 'pointer',
                opacity: busy || !password ? 0.65 : 1,
              }}
            >
              {busy ? 'Verifying…' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
