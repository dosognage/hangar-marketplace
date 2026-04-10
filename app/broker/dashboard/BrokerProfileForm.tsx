'use client'

import { useActionState } from 'react'
import { saveBrokerProfile, type BrokerProfileState } from '@/app/actions/broker'

interface Props {
  profileId:        string
  currentPhone:     string | null
  currentEmail:     string | null
  currentWebsite:   string | null
  currentBio:       string | null
}

const INITIAL: BrokerProfileState = {}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: '600',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.35rem',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.55rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '7px',
  fontSize: '0.875rem',
  color: '#111827',
  backgroundColor: 'white',
  outline: 'none',
  boxSizing: 'border-box',
}

export default function BrokerProfileForm({
  profileId,
  currentPhone,
  currentEmail,
  currentWebsite,
  currentBio,
}: Props) {
  const [state, action, isPending] = useActionState(saveBrokerProfile, INITIAL)

  return (
    <form action={action}>
      {/* Success / error banner */}
      {state.success && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.65rem 0.9rem',
          borderRadius: '7px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#166534',
          fontSize: '0.85rem',
          fontWeight: '500',
        }}>
          ✓ {state.success}
        </div>
      )}
      {state.error && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.65rem 0.9rem',
          borderRadius: '7px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          fontSize: '0.85rem',
          fontWeight: '500',
        }}>
          {state.error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Phone */}
        <div>
          <label htmlFor="bp-phone" style={labelStyle}>Phone</label>
          <input
            id="bp-phone"
            name="phone"
            type="tel"
            defaultValue={currentPhone ?? ''}
            placeholder="+1 (555) 000-0000"
            style={inputStyle}
          />
        </div>

        {/* Contact email */}
        <div>
          <label htmlFor="bp-email" style={labelStyle}>Contact Email</label>
          <input
            id="bp-email"
            name="contact_email"
            type="email"
            defaultValue={currentEmail ?? ''}
            placeholder="you@brokerage.com"
            style={inputStyle}
          />
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', color: '#9ca3af' }}>
            Shown publicly on your broker profile
          </p>
        </div>

        {/* Website — full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="bp-website" style={labelStyle}>Website</label>
          <input
            id="bp-website"
            name="website"
            type="url"
            defaultValue={currentWebsite ?? ''}
            placeholder="https://yourbrokerage.com"
            style={inputStyle}
          />
        </div>

        {/* Bio — full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="bp-bio" style={labelStyle}>Bio</label>
          <textarea
            id="bp-bio"
            name="bio"
            rows={4}
            defaultValue={currentBio ?? ''}
            placeholder="Tell buyers a bit about your experience, focus areas, or specialties…"
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
          />
        </div>
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: '0.55rem 1.25rem',
            backgroundColor: isPending ? '#9ca3af' : '#111827',
            color: 'white',
            border: 'none',
            borderRadius: '7px',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: isPending ? 'not-allowed' : 'pointer',
          }}
        >
          {isPending ? 'Saving…' : 'Save profile'}
        </button>
        <a
          href={`/broker/${profileId}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '0.8rem', color: '#6366f1', textDecoration: 'none' }}
        >
          View public profile →
        </a>
      </div>
    </form>
  )
}
