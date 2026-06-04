'use client'

/**
 * PreLaunchSignup
 *
 * Email capture for the "Mobile app coming soon" sections (home page +
 * /app landing page). Submits to the `subscribePreLaunch` server action,
 * which inserts into `pre_launch_signups` via anon RLS.
 *
 * UX guarantees:
 * - Idempotent — duplicate emails see the same "you're on the list" state.
 * - Honest copy — "coming soon", no false urgency, no specific date.
 * - Accessible — labels, aria-live status, focus styles, disabled-while-loading.
 *
 * Visual variants:
 * - `variant="compact"`  → row-style (used on the home strip)
 * - `variant="prominent"` → larger, used on /app
 */

import { useState } from 'react'
import { subscribePreLaunch } from '@/app/actions/pre-launch'

type Variant = 'compact' | 'prominent'

type Props = {
  source?: string
  variant?: Variant
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function PreLaunchSignup({
  source = 'web-home',
  variant = 'compact',
}: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'loading') return

    setStatus('loading')
    setMessage('')

    try {
      const result = await subscribePreLaunch(email, source)
      if (result.status === 'success') {
        setStatus('success')
        setMessage("You're on the list. Thanks — we'll be in touch.")
        setEmail('')
      } else if (result.status === 'error') {
        setStatus('error')
        setMessage(result.message)
      }
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: variant === 'prominent' ? '0.85rem 1rem' : '0.6rem 0.85rem',
          backgroundColor: variant === 'prominent' ? '#ecfdf5' : '#0f3a2a',
          border: `1px solid ${variant === 'prominent' ? '#a7f3d0' : '#10b981'}`,
          borderRadius: '8px',
          color: variant === 'prominent' ? '#065f46' : '#a7f3d0',
          fontSize: variant === 'prominent' ? '0.9rem' : '0.825rem',
          fontWeight: '600',
        }}
      >
        <span aria-hidden="true">✓</span>
        <span>{message}</span>
      </div>
    )
  }

  const isProminent = variant === 'prominent'

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        width: '100%',
      }}
      noValidate
    >
      <label
        htmlFor={`pre-launch-email-${variant}`}
        style={{
          // Visually hidden but available to screen readers — the input has a
          // visible placeholder, but a label is required for accessibility.
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        Email address
      </label>

      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        <input
          id={`pre-launch-email-${variant}`}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          maxLength={320}
          disabled={status === 'loading'}
          aria-invalid={status === 'error'}
          aria-describedby={status === 'error' ? `pre-launch-error-${variant}` : undefined}
          style={{
            flex: '1 1 200px',
            minWidth: '180px',
            padding: isProminent ? '0.7rem 0.9rem' : '0.5rem 0.75rem',
            fontSize: isProminent ? '0.95rem' : '0.825rem',
            backgroundColor: isProminent ? 'white' : '#1f2937',
            border: `1px solid ${
              status === 'error'
                ? '#ef4444'
                : isProminent
                ? '#d1d5db'
                : '#374151'
            }`,
            borderRadius: '8px',
            color: isProminent ? '#111827' : '#e5e7eb',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={status === 'loading' || !email}
          style={{
            padding: isProminent ? '0.7rem 1.25rem' : '0.5rem 1rem',
            fontSize: isProminent ? '0.95rem' : '0.825rem',
            fontWeight: '700',
            backgroundColor: status === 'loading' ? '#374151' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: status === 'loading' || !email ? 'default' : 'pointer',
            opacity: !email ? 0.5 : 1,
            whiteSpace: 'nowrap',
            transition: 'background-color 0.15s, opacity 0.15s',
          }}
        >
          {status === 'loading' ? 'Sending…' : 'Notify me'}
        </button>
      </div>

      <p
        style={{
          margin: 0,
          fontSize: '0.7rem',
          color: isProminent ? '#6b7280' : '#6b7280',
          lineHeight: 1.5,
        }}
      >
        We&apos;ll only email you when the app launches. No spam, no list-sharing.
      </p>

      {status === 'error' && message && (
        <p
          id={`pre-launch-error-${variant}`}
          role="alert"
          style={{
            margin: 0,
            fontSize: '0.75rem',
            color: isProminent ? '#b91c1c' : '#f87171',
          }}
        >
          {message}
        </p>
      )}
    </form>
  )
}
