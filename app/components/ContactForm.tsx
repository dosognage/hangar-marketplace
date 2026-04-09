'use client'

/**
 * ContactForm
 *
 * Shown on each listing detail page.
 * Submits to POST /api/contact which sends:
 *   - An inquiry email to the seller
 *   - A confirmation email to the buyer
 */

import { useState } from 'react'

type Props = {
  listingId: string
  listingTitle: string
  sellerName: string
  sellerEmail: string
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function ContactForm({ listingId, listingTitle, sellerName, sellerEmail }: Props) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerName: form.name,
          buyerEmail: form.email,
          buyerPhone: form.phone || undefined,
          message: form.message,
          listingId,
          listingTitle,
          sellerName,
          sellerEmail,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.')
        setStatus('error')
        return
      }

      setStatus('success')
      setForm({ name: '', email: '', phone: '', message: '' })
    } catch {
      setErrorMsg('Network error — please check your connection and try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div style={wrapperStyle}>
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          backgroundColor: '#f0fdf4',
          borderRadius: '8px',
          border: '1px solid #bbf7d0',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
          <h3 style={{ margin: '0 0 0.5rem', color: '#166534' }}>Message sent!</h3>
          <p style={{ margin: 0, color: '#166534', fontSize: '0.9rem' }}>
            Your message has been sent to {sellerName}. Check your inbox — you should
            also receive a confirmation email shortly.
          </p>
          <button
            onClick={() => setStatus('idle')}
            style={{ marginTop: '1.25rem', background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
          >
            Send another message
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={wrapperStyle}>
      <h2 style={{ margin: '0 0 0.25rem', fontSize: '1rem', color: '#374151' }}>
        Contact {sellerName}
      </h2>
      <p style={{ margin: '0 0 1.25rem', color: '#6b7280', fontSize: '0.875rem' }}>
        Send a message directly — the seller will reply to your email address.
      </p>

      {status === 'error' && (
        <div style={{
          backgroundColor: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: '6px', padding: '0.75rem 1rem',
          color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem',
        }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div style={rowStyle}>
          <Field label="Your name *">
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Jane Smith"
              required
              style={inputStyle}
            />
          </Field>
          <Field label="Your email *">
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="jane@example.com"
              required
              style={inputStyle}
            />
          </Field>
        </div>

        <Field label="Phone (optional)">
          <input
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            placeholder="(555) 000-0000"
            style={inputStyle}
          />
        </Field>

        <Field label="Message *">
          <textarea
            name="message"
            value={form.message}
            onChange={handleChange}
            placeholder={`Hi, I'm interested in this hangar. Is it still available?`}
            required
            rows={4}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </Field>

        <button
          type="submit"
          disabled={status === 'loading'}
          style={{
            padding: '0.75rem',
            backgroundColor: status === 'loading' ? '#6b7280' : '#111827',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '700',
            fontSize: '0.95rem',
            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s',
          }}
        >
          {status === 'loading' ? 'Sending…' : `Send Message to ${sellerName}`}
        </button>

        <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center' }}>
          Your contact info is only shared with the seller.
        </p>
      </form>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
      <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#6b7280' }}>{label}</label>
      {children}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────

const wrapperStyle: React.CSSProperties = {
  backgroundColor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '1.25rem',
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.85rem',
  flexWrap: 'wrap',
}

const inputStyle: React.CSSProperties = {
  padding: '0.55rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.9rem',
  width: '100%',
  boxSizing: 'border-box',
  backgroundColor: '#fafafa',
}
