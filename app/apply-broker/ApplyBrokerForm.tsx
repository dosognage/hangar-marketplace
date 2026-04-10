'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitBrokerApplication } from '@/app/actions/broker'
import Link from 'next/link'

type Status = 'idle' | 'loading' | 'error'

export default function ApplyBrokerForm() {
  const [form, setForm] = useState({
    full_name:      '',
    brokerage:      '',
    license_state:  '',
    license_number: '',
    phone:          '',
    website:        '',
    bio:            '',
  })
  const [status, setStatus]     = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const { error } = await submitBrokerApplication(form)

    if (error) {
      setErrorMsg(error)
      setStatus('error')
      return
    }

    router.push('/apply-broker/success')
  }

  return (
    <div style={{ maxWidth: '620px' }}>
      <Link href="/dashboard" style={{ color: '#6366f1', textDecoration: 'none', fontSize: '0.875rem' }}>
        Back to dashboard
      </Link>

      <div style={{ margin: '1.25rem 0 2rem' }}>
        <h1 style={{ margin: '0 0 0.4rem' }}>Apply for Broker Verification</h1>
        <p style={{ margin: 0, color: '#6b7280', lineHeight: 1.6 }}>
          Verified brokers get a public profile page, a verified badge on their listings,
          and are featured in broker search. Submit your license details below. Our team
          reviews every application before approval.
        </p>
      </div>

      {/* What you get */}
      <div style={{
        backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px',
        padding: '1.25rem', marginBottom: '2rem', display: 'grid', gap: '0.5rem',
      }}>
        <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem', color: '#1e40af' }}>
          What verified brokers get
        </p>
        {[
          'Public profile page at hangarmarketplace.com/broker/[your-name]',
          'Verified badge on all your listings',
          'Listings go live immediately with no review wait',
          'Dedicated broker dashboard with analytics',
        ].map(item => (
          <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <span style={{ color: '#2563eb', fontWeight: '700', flexShrink: 0 }}>✓</span>
            <span style={{ fontSize: '0.875rem', color: '#1e40af' }}>{item}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.1rem' }}>
        <Section title="Personal Info">
          <Field label="Full legal name *">
            <input name="full_name" value={form.full_name} onChange={handleChange} required placeholder="Jane Smith" style={inputStyle} />
          </Field>
          <Field label="Brokerage / company name *">
            <input name="brokerage" value={form.brokerage} onChange={handleChange} required placeholder="Smith Aviation Realty" style={inputStyle} />
          </Field>
          <Field label="Phone (optional)">
            <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="(555) 000-0000" style={inputStyle} />
          </Field>
          <Field label="Website (optional)">
            <input name="website" type="url" value={form.website} onChange={handleChange} placeholder="https://yoursite.com" style={inputStyle} />
          </Field>
        </Section>

        <Section title="License Information">
          <TwoCol>
            <Field label="License state *">
              <input name="license_state" value={form.license_state} onChange={handleChange} required placeholder="FL" maxLength={2} style={inputStyle} />
            </Field>
            <Field label="License number *">
              <input name="license_number" value={form.license_number} onChange={handleChange} required placeholder="BK12345678" style={inputStyle} />
            </Field>
          </TwoCol>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.5 }}>
            We verify your license with your state's real estate commission. Your license
            number will not be publicly displayed.
          </p>
        </Section>

        <Section title="Public Bio (optional)">
          <Field label="About you">
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              rows={4}
              placeholder="Tell buyers about your experience with aviation real estate, specialties, years in business, etc."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>
        </Section>

        <div style={{
          backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px',
          padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.5,
        }}>
          By submitting, you confirm that the information provided is accurate and that you
          hold an active real estate license in the state listed above. False information
          will result in permanent removal from the platform.
        </div>

        {/* Error — shown right above the button so it's always in view on mobile */}
        {status === 'error' && (
          <div style={{
            backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px',
            padding: '0.75rem 1rem', color: '#dc2626', fontSize: '0.875rem',
          }}>
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          style={{
            padding: '0.85rem', color: 'white', border: 'none', borderRadius: '8px',
            fontSize: '1rem', fontWeight: '700', cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            backgroundColor: status === 'loading' ? '#6b7280' : '#111827',
            opacity: status === 'loading' ? 0.8 : 1,
            transition: 'background-color 0.15s',
          }}
        >
          {status === 'loading' ? 'Submitting…' : 'Submit Application'}
        </button>
      </form>
    </div>
  )
}

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
