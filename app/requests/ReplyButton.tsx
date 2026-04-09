'use client'

import { useState } from 'react'
import { useToast } from '@/app/components/ToastProvider'

type Props = {
  requestId: string
  contactName: string
  userId: string | null
}

type FormState = { name: string; email: string; phone: string; message: string }

export default function ReplyButton({ requestId, contactName, userId }: Props) {
  const [open, setOpen]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)
  const [form, setForm]     = useState<FormState>({ name: '', email: '', phone: '', message: '' })
  const { addToast }        = useToast()

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/request-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, ...form }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        addToast(d.error ?? 'Failed to send. Try again.', 'error')
        return
      }
      setSent(true)
      addToast(`Reply sent to ${contactName}!`, 'success')
    } catch {
      addToast('Network error. Check your connection.', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
        padding: '0.4rem 0.85rem', borderRadius: '6px', fontSize: '0.825rem',
        fontWeight: '600', backgroundColor: '#f0fdf4', color: '#166534',
        border: '1px solid #bbf7d0',
      }}>
        ✓ Reply sent
      </span>
    )
  }

  return (
    <div style={{ flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '0.45rem 1rem',
          backgroundColor: open ? '#f9fafb' : '#1a3a5c',
          color: open ? '#374151' : 'white',
          border: open ? '1px solid #d1d5db' : '1px solid #1a3a5c',
          borderRadius: '6px', fontSize: '0.825rem', fontWeight: '600',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        {open ? 'Cancel' : 'I Have Space →'}
      </button>

      {open && (
        <div style={{
          marginTop: '0.75rem',
          padding: '1.1rem',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
        }}>
          <p style={{ margin: '0 0 0.85rem', fontSize: '0.825rem', color: '#374151', lineHeight: 1.5 }}>
            Your message will be emailed directly to <strong>{contactName}</strong> with your contact info.
            {!userId && (
              <span style={{ color: '#6b7280' }}> You don't need an account to reply.</span>
            )}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <Field label="Your name *">
                <input name="name" value={form.name} onChange={handleChange}
                  required placeholder="Jane Smith" style={inputStyle} />
              </Field>
              <Field label="Email *">
                <input name="email" type="email" value={form.email} onChange={handleChange}
                  required placeholder="jane@example.com" style={inputStyle} />
              </Field>
            </div>

            <Field label="Phone (optional)">
              <input name="phone" type="tel" value={form.phone} onChange={handleChange}
                placeholder="(555) 000-0000" style={inputStyle} />
            </Field>

            <Field label="Tell them about your space *">
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                required
                rows={3}
                placeholder={`Hi, I have a hangar at ${contactName}'s requested airport. Here's what I have available…`}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </Field>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.65rem', backgroundColor: loading ? '#6b7280' : '#111827',
                color: 'white', border: 'none', borderRadius: '6px',
                fontWeight: '700', fontSize: '0.9rem', cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Sending…' : `Send to ${contactName}`}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.7rem', border: '1px solid #d1d5db', borderRadius: '6px',
  fontSize: '0.875rem', width: '100%', boxSizing: 'border-box', backgroundColor: 'white',
}
