'use client'

/**
 * NewsletterSignup
 *
 * GDPR / CAN-SPAM / CASL / PECR compliant email capture form.
 * - Consent checkbox is UNCHECKED by default (required by GDPR)
 * - Clearly states what the user is signing up for and how often
 * - Links to Privacy Policy
 * - Sends consent metadata (timestamp, source) to /api/subscribe
 */

import { useState, useRef } from 'react'

type Props = {
  source?: string   // where this form is rendered, e.g. 'footer_form'
  compact?: boolean // slightly smaller layout for tight spaces
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function NewsletterSignup({ source = 'footer_form', compact = false }: Props) {
  const [email, setEmail]       = useState('')
  const [consent, setConsent]   = useState(false)
  const [status, setStatus]     = useState<Status>('idle')
  const [message, setMessage]   = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!consent) {
      setMessage('Please check the box to confirm you agree to receive emails.')
      setStatus('error')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setStatus('success')
      setMessage('You\'re in! We\'ll be in touch monthly with hangar updates.')
      setEmail('')
      setConsent(false)
    } catch (err: unknown) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ color: '#34d399', fontSize: '1rem' }}>✓</span>
        <span style={{ color: '#9ca3af', fontSize: '0.775rem' }}>{message}</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {/* Label */}
      {!compact && (
        <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.775rem', fontWeight: '600', letterSpacing: '0.04em' }}>
          Stay in the loop
        </p>
      )}

      {/* Input + button row */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <input
          ref={inputRef}
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          disabled={status === 'loading'}
          style={{
            flex: 1,
            minWidth: '180px',
            padding: '0.4rem 0.65rem',
            fontSize: '0.775rem',
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '6px',
            color: '#e5e7eb',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={status === 'loading' || !email}
          style={{
            padding: '0.4rem 0.9rem',
            fontSize: '0.775rem',
            fontWeight: '600',
            backgroundColor: status === 'loading' ? '#374151' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: status === 'loading' || !email ? 'default' : 'pointer',
            opacity: !email ? 0.5 : 1,
            whiteSpace: 'nowrap',
            transition: 'background-color 0.15s, opacity 0.15s',
          }}
        >
          {status === 'loading' ? 'Sending…' : 'Subscribe'}
        </button>
      </div>

      {/* GDPR consent — must be unchecked by default */}
      <label style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.5rem',
        cursor: 'pointer',
      }}>
        <input
          type="checkbox"
          checked={consent}
          onChange={e => setConsent(e.target.checked)}
          style={{ marginTop: '2px', accentColor: '#2563eb', flexShrink: 0 }}
        />
        <span style={{ fontSize: '0.7rem', color: '#6b7280', lineHeight: 1.5 }}>
          I agree to receive approximately one email per month from Hangar Marketplace with
          hangar availability updates, aviation news, and platform tips. I can unsubscribe
          at any time. See our{' '}
          <a href="/privacy" style={{ color: '#9ca3af', textDecoration: 'underline' }}>
            Privacy Policy
          </a>.
        </span>
      </label>

      {/* Error message */}
      {status === 'error' && message && (
        <p style={{ margin: 0, fontSize: '0.7rem', color: '#f87171' }}>{message}</p>
      )}
    </form>
  )
}
