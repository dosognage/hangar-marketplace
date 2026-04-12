'use client'

/**
 * Post a Hangar Request
 *
 * Flow:
 *  1. User fills out form and picks Standard ($7.99) or High-Priority ($29.99)
 *  2. On submit: request saved to DB with status 'pending_payment'
 *  3. Redirected to Stripe hosted checkout
 *  4. On payment success: webhook sets status to 'active'
 */

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AircraftAutocomplete from '@/app/components/AircraftAutocomplete'
import type { AircraftSpec } from '@/lib/aircraft-data'
import { Zap } from 'lucide-react'


const DURATIONS = ['Month-to-month', '3 months', '6 months', '1 year', 'Permanent']

const EMPTY = {
  contact_name:   '',
  contact_email:  '',
  contact_phone:  '',
  airport_code:   '',
  airport_name:   '',
  city:           '',
  state:          '',
  aircraft_type:  '',
  wingspan_ft:    '',
  door_width_ft:  '',
  door_height_ft: '',
  monthly_budget: '',
  duration:       '',
  move_in_date:   '',
  notes:          '',
}

type Status = 'idle' | 'loading' | 'error'

function NewRequestForm() {
  const searchParams = useSearchParams()
  const wasCancelled = searchParams.get('cancelled') === '1'

  const [form, setForm] = useState(EMPTY)
  const [isPriority, setIsPriority] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function handleAircraftSelect(spec: AircraftSpec) {
    setForm(prev => ({
      ...prev,
      aircraft_type:  spec.name,
      wingspan_ft:    String(spec.wingspan_ft),
      // Suggest minimum door dims: wingspan + 4 ft clearance, height + 2 ft clearance
      door_width_ft:  String(Math.ceil(spec.wingspan_ft + 4)),
      door_height_ft: String(Math.ceil(spec.height_ft + 2)),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    // Step 1: Save request via API route (uses supabaseAdmin — bypasses RLS)
    const insertRes = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
        is_priority:    isPriority,
        pending_payment: true,
      }),
    })

    const { id: requestId, error: insertError } = await insertRes.json()

    if (insertError || !requestId) {
      setErrorMsg(insertError ?? 'Failed to save request.')
      setStatus('error')
      return
    }

    const request = { id: requestId }

    // Step 2: Create Stripe checkout session
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: request.id, is_priority: isPriority }),
    })

    const { url, error: checkoutError } = await res.json()

    if (checkoutError || !url) {
      setErrorMsg(checkoutError ?? 'Failed to start checkout.')
      setStatus('error')
      return
    }

    // Step 3: Redirect to Stripe hosted checkout
    window.location.href = url
  }

  const price = isPriority ? '$29.99' : '$7.99'

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

      {wasCancelled && (
        <div style={{
          backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px',
          padding: '0.75rem 1rem', color: '#92400e', fontSize: '0.875rem', marginBottom: '1.25rem',
        }}>
          Payment was cancelled. Your request was not posted. Fill out the form again to try.
        </div>
      )}

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
            Your email is only shared with owners who respond. It's not publicly displayed.
          </p>
        </Section>

        {/* Airport */}
        <Section title="Airport">
          <TwoCol>
            <Field label="Airport code *">
              <input name="airport_code" value={form.airport_code} onChange={handleChange}
                required placeholder="KPAE" maxLength={6} style={inputStyle} />
            </Field>
            <Field label="Airport name *">
              <input name="airport_name" value={form.airport_name} onChange={handleChange}
                required placeholder="Paine Field" style={inputStyle} />
            </Field>
          </TwoCol>
          <TwoCol>
            <Field label="City">
              <input name="city" value={form.city} onChange={handleChange}
                placeholder="Everett" style={inputStyle} />
            </Field>
            <Field label="State">
              <input name="state" value={form.state} onChange={handleChange}
                placeholder="WA" maxLength={2} style={inputStyle} />
            </Field>
          </TwoCol>
        </Section>

        {/* Aircraft */}
        <Section title="Aircraft Info">
          <Field label="Aircraft type">
            <AircraftAutocomplete
              value={form.aircraft_type}
              onChange={val => setForm(prev => ({ ...prev, aircraft_type: val }))}
              onSelect={handleAircraftSelect}
              inputStyle={inputStyle}
            />
          </Field>
          <TwoCol>
            <Field label="Wingspan (ft)">
              <input name="wingspan_ft" type="number" value={form.wingspan_ft}
                onChange={handleChange} placeholder="36" min="0" style={inputStyle} />
            </Field>
            <Field label="Min door width needed (ft)">
              <input name="door_width_ft" type="number" value={form.door_width_ft}
                onChange={handleChange} placeholder="40" min="0" style={inputStyle} />
            </Field>
          </TwoCol>
          <Field label="Min door height needed (ft)">
            <input name="door_height_ft" type="number" value={form.door_height_ft}
              onChange={handleChange} placeholder="12" min="0" style={inputStyle} />
          </Field>
          <p style={{ margin: '-0.3rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
            Door dimensions are auto-suggested when you pick an aircraft. Feel free to adjust.
          </p>
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

        {/* Placement — Standard vs Priority */}
        <div style={{
          backgroundColor: 'white', border: '1px solid #e5e7eb',
          borderRadius: '10px', padding: '1.25rem',
        }}>
          <h2 style={{ margin: '0 0 0.85rem', fontSize: '0.95rem', color: '#374151' }}>
            Listing Placement
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {/* Standard */}
            <button
              type="button"
              onClick={() => setIsPriority(false)}
              style={{
                padding: '1rem', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                border: `2px solid ${!isPriority ? '#6366f1' : '#e5e7eb'}`,
                backgroundColor: !isPriority ? '#f5f3ff' : 'white',
                transition: 'border-color 0.15s, background-color 0.15s',
              }}
            >
              <div style={{ fontWeight: '700', color: '#111827', marginBottom: '0.25rem' }}>
                Standard ($7.99)
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.5 }}>
                Listed on the request board chronologically.
              </div>
            </button>

            {/* High Priority */}
            <button
              type="button"
              onClick={() => setIsPriority(true)}
              style={{
                padding: '1rem', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                border: `2px solid ${isPriority ? '#f59e0b' : '#e5e7eb'}`,
                backgroundColor: isPriority ? '#fffbeb' : 'white',
                transition: 'border-color 0.15s, background-color 0.15s',
                position: 'relative',
              }}
            >
              <div style={{
                position: 'absolute', top: '-10px', right: '10px',
                backgroundColor: '#f59e0b', color: 'white',
                fontSize: '0.65rem', fontWeight: '800',
                padding: '0.15rem 0.45rem', borderRadius: '999px',
              }}>
                POPULAR
              </div>
              <div style={{ fontWeight: '700', color: '#111827', marginBottom: '0.25rem' }}>
                High-Priority ($29.99)
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.5 }}>
                Pinned to the top with a priority badge, seen first by every owner.
              </div>
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          style={{
            padding: '0.85rem', backgroundColor: '#111827', color: 'white',
            border: 'none', borderRadius: '8px', fontSize: '1rem',
            fontWeight: '700', cursor: status === 'loading' ? 'default' : 'pointer',
            opacity: status === 'loading' ? 0.7 : 1,
          }}
        >
          {status === 'loading' ? 'Redirecting to payment…' : `Continue to Payment (${price})`}
        </button>

        <p style={{ margin: '-0.5rem 0 0', textAlign: 'center', fontSize: '0.78rem', color: '#9ca3af' }}>
          Secure checkout via Stripe. Your request goes live immediately after payment.
        </p>
      </form>
    </div>
  )
}

export default function NewRequestPage() {
  return (
    <Suspense fallback={<div style={{ maxWidth: '640px' }}><p style={{ color: '#6b7280' }}>Loading…</p></div>}>
      <NewRequestForm />
    </Suspense>
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
