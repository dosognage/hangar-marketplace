'use client'

import { useState } from 'react'
import { useToast } from './ToastProvider'
import DatePicker from './DatePicker'

type Props = {
  brokerProfileId: string
  brokerName: string
  listingId?: string
  listingTitle?: string
}

export default function ShowingRequestButton({ brokerProfileId, brokerName, listingId, listingTitle }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const [form, setForm] = useState({
    name: '', email: '', phone: '', preferred_date: '', preferred_time: '', message: '',
  })

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
      | { target: { name: string; value: string } }
  ) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email) return
    setLoading(true)
    try {
      const res = await fetch('/api/showing-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broker_profile_id: brokerProfileId,
          listing_id: listingId ?? null,
          requester_name: form.name,
          requester_email: form.email,
          requester_phone: form.phone || null,
          preferred_date: form.preferred_date || null,
          preferred_time: form.preferred_time || null,
          message: form.message || null,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      addToast('Request sent! The broker will be in touch soon.', 'success')
      setOpen(false)
      setForm({ name: '', email: '', phone: '', preferred_date: '', preferred_time: '', message: '' })
    } catch {
      addToast('Could not send request. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
          padding: '0.6rem 1.25rem',
          backgroundColor: '#1a3a5c', color: 'white',
          border: 'none', borderRadius: '8px',
          fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        Request a showing
      </button>

      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div style={{
            backgroundColor: 'white', borderRadius: '12px',
            width: '100%', maxWidth: '480px',
            padding: '2rem', position: 'relative',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <button
              onClick={() => setOpen(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1.25rem' }}
            >✕</button>

            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', color: '#111827' }}>
              Request a showing
            </h2>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.825rem', color: '#6b7280' }}>
              {listingTitle ? `For: ${listingTitle}` : `With: ${brokerName}`}
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Your name *</label>
                  <input name="name" required value={form.name} onChange={handleChange}
                    placeholder="Jane Smith" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input name="email" type="email" required value={form.email} onChange={handleChange}
                    placeholder="you@email.com" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Phone (optional)</label>
                  <input name="phone" type="tel" value={form.phone} onChange={handleChange}
                    placeholder="+1 (555) 000-0000" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Preferred date</label>
                  <DatePicker
                    name="preferred_date"
                    value={form.preferred_date}
                    onChange={handleChange}
                    placeholder="Select a date"
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Preferred time</label>
                <select name="preferred_time" value={form.preferred_time} onChange={handleChange} style={inputStyle}>
                  <option value="">Any time</option>
                  <option value="Morning (8am–12pm)">Morning (8am–12pm)</option>
                  <option value="Afternoon (12pm–5pm)">Afternoon (12pm–5pm)</option>
                  <option value="Evening (5pm–8pm)">Evening (5pm–8pm)</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Message (optional)</label>
                <textarea name="message" value={form.message} onChange={handleChange}
                  rows={3} placeholder="Tell the broker what you're looking for, aircraft type, etc."
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.7rem', backgroundColor: loading ? '#9ca3af' : '#1a3a5c',
                  color: 'white', border: 'none', borderRadius: '8px',
                  fontWeight: '600', fontSize: '0.9rem', cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Sending…' : 'Send request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.75rem', fontWeight: '600',
  color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em',
  marginBottom: '0.3rem',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.7rem',
  border: '1px solid #d1d5db', borderRadius: '7px',
  fontSize: '0.875rem', color: '#111827', backgroundColor: 'white',
  outline: 'none', boxSizing: 'border-box',
}
