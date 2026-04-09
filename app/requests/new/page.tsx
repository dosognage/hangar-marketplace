'use client'

/**
 * Post a Hangar Request
 *
 * Any GA operator can post what they're looking for.
 * No account required — contact info is stored alongside the request.
 */

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const DURATIONS = ['Month-to-month', '3 months', '6 months', '1 year', 'Permanent']

const EMPTY = {
  contact_name:  '',
  contact_email: '',
  contact_phone: '',
  airport_code:  '',
  airport_name:  '',
  city:          '',
  state:         '',
  aircraft_type: '',
  wingspan_ft:   '',
  door_width_ft: '',
  door_height_ft:'',
  monthly_budget:'',
  duration:      '',
  move_in_date:  '',
  notes:         '',
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function NewRequestPage() {
  const [form, setForm]     = useState(EMPTY)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const { error } = await supabase.from('hangar_requests').insert([{
      contact_name:   form.contact_name,
      contact_email:  form.contact_email,
      contact_phone:  form.contact_phone  || null,
      airport_code:   form.airport_code.toUpperCase().trim(),
      airport_name:   form.airport_name,
      city:           form.city           || null,
      state:          form.state          || null,
      aircraft_type:  form.aircraft_type  || null,
      wingspan_ft:    form.wingspan_ft    ? Number(form.wingspan_ft)    : null,
      door_width_ft:  form.door_width_ft  ? Number(form.door_width_ft)  : null,
      door_height_ft: form.door_height_ft ? Number(form.door_height_ft) : null,
      monthly_budget: form.monthly_budget ? Number(form.monthly_budget) : null,
      duration:       form.duration       || null,
      move_in_date:   form.move_in_date   || null,
      notes:          form.notes          || null,
      status:         'active',
    }])

    if (error) {
      setErrorMsg(error.message)
      setStatus('error')
      return
    }
    setStatus('success')
  }

  if (status === 'success') {
    return (
      <div style={{ maxWidth: '600px' }}>
        <div style={{
          backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: '12px', padding: '2.5rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ margin: '0 0 0.75rem', color: '#166534' }}>Request posted!</h2>
          <p style={{ margin: '0 0 1.5rem', color: '#166534', lineHeight: 1.6 }}>
            Your hangar request is now live. Hangar owners at{' '}
            <strong>{form.airport_code.toUpperCase()}</strong> can see it and reply
            directly to your email address.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/requests" style={{
              padding: '0.6rem 1.25rem', backgroundColor: '#111827', color: 'white',
              borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '0.875rem',
            }}>
              View all requests
            </Link>
            <button
              onClick={() => { setForm(EMPTY); setStatus('idle') }}
              style={{
                padding: '0.6rem 1.25rem', backgroundColor: 'white', color: '#374151',
                border: '1px solid #d1d5db', borderRadius: '6px',
                fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer',
              }}
            >
              Post another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '640px' }}>
      <Link href="/requests" style={{ color: '#6366f1', textDecoration: 'none', fontSize: '0.875rem' }}>
        ← Back to requests
      </Link>

      <div style={{ margin: '1.25rem 0 2rem' }}>
        <h1 style={{ margin: '0 0 0.4rem' }}>Post a Hangar Request</h1>
        <p style={{ margin: 0, color: '#6b7280', lineHeight: 1.6 }}>
          Tell hangar owners what you're looking for. They'll contact you directly
          when they have matching space available.
        </p>
      </div>

      {status === 'error' && (
        <div style={{
          backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px',
          padding: '0.75rem 1rem', color: '#dc2626', fontSize: '0.875rem', marginBottom: '1.25rem',
        }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.1rem' }}>

        {/* Contact */}
        <Section title="Your Contact Info">
          <Field label="Your name *">
            <input name="contact_name" value={form.contact_name} onChange={handleChange}
              required placeholder="Jane Smith" style={inputStyle} />
          </Field>
          <TwoCol>
            <Field label="Email *">
              <input name="contact_email" type="email" value={form.contact_email}
                onChange={handleChange} required placeholder="jane@example.com" style={inputStyle} />
            </Field>
            <Field label="Phone (optional)">
              <input name="contact_phone" type="tel" value={form.contact_phone}
                onChange={handleChange} placeholder="(555) 000-0000" style={inputStyle} />
            </Field>
          </TwoCol>
          <p style={{ margin: '0.1rem 0 0', fontSize: '0.78rem', color: '#9ca3af' }}>
            Your email is only shared with owners who respond — it's not publicly displayed.
          </p>
        </Section>

        {/* Airport */}
        <Section title="Airport">
          <TwoCol>
            <Field label="Airport code *">
              <input name="airport_code" value={form.airport_code} onChange={handleChange}
                required placeholder="KGVL" maxLength={6} style={inputStyle} />
            </Field>
            <Field label="Airport name *">
              <input name="airport_name" value={form.airport_name} onChange={handleChange}
                required placeholder="Gainesville Regional" style={inputStyle} />
            </Field>
          </TwoCol>
          <TwoCol>
            <Field label="City">
              <input name="city" value={form.city} onChange={handleChange}
                placeholder="Gainesville" style={inputStyle} />
            </Field>
            <Field label="State">
              <input name="state" value={form.state} onChange={handleChange}
                placeholder="FL" maxLength={2} style={inputStyle} />
            </Field>
          </TwoCol>
        </Section>

        {/* Aircraft */}
        <Section title="Aircraft Info">
          <TwoCol>
            <Field label="Aircraft type">
              <input name="aircraft_type" value={form.aircraft_type} onChange={handleChange}
                placeholder="Cessna 172, Piper Arrow…" style={inputStyle} />
            </Field>
            <Field label="Wingspan (ft)">
              <input name="wingspan_ft" type="number" value={form.wingspan_ft}
                onChange={handleChange} placeholder="36" min="0" style={inputStyle} />
            </Field>
          </TwoCol>
          <TwoCol>
            <Field label="Min door width needed (ft)">
              <input name="door_width_ft" type="number" value={form.door_width_ft}
                onChange={handleChange} placeholder="38" min="0" style={inputStyle} />
            </Field>
            <Field label="Min door height needed (ft)">
              <input name="door_height_ft" type="number" value={form.door_height_ft}
                onChange={handleChange} placeholder="12" min="0" style={inputStyle} />
            </Field>
          </TwoCol>
        </Section>

        {/* Terms */}
        <Section title="Terms & Timing">
          <TwoCol>
            <Field label="Monthly budget ($)">
              <input name="monthly_budget" type="number" value={form.monthly_budget}
                onChange={handleChange} placeholder="350" min="0" style={inputStyle} />
            </Field>
            <Field label="Duration">
              <select name="duration" value={form.duration} onChange={handleChange} style={inputStyle}>
                <option value="">Not sure</option>
                {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
          </TwoCol>
          <Field label="Desired move-in date">
            <input name="move_in_date" type="date" value={form.move_in_date}
              onChange={handleChange} style={inputStyle} />
          </Field>
        </Section>

        {/* Notes */}
        <Section title="Additional Notes">
          <Field label="Anything else owners should know">
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={4}
              placeholder="Power requirements, tail dragger, floatplane, heated hangar preferred, etc."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>
        </Section>

        <button type="submit" disabled={status === 'loading'} style={{
          padding: '0.85rem', backgroundColor: '#111827', color: 'white',
          border: 'none', borderRadius: '8px', fontSize: '1rem',
          fontWeight: '700', cursor: 'pointer',
        }}>
          {status === 'loading' ? 'Posting…' : 'Post Request'}
        </button>
      </form>
    </div>
  )
}

// ── Layout helpers ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem' }}>
      <h2 style={{ margin: '0 0 1rem', fontSize: '0.95rem', color: '#374151' }}>{title}</h2>
      <div style={{ display: 'grid', gap: '0.85rem' }}>{children}</div>
    </div>
  )
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#6b7280' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '0.55rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px',
  fontSize: '0.9rem', width: '100%', boxSizing: 'border-box', backgroundColor: '#fafafa',
}
