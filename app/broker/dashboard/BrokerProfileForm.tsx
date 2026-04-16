'use client'

import { useActionState } from 'react'
import { saveBrokerProfile, type BrokerProfileState } from '@/app/actions/broker'

interface Props {
  profileId:               string
  currentBrokerage:        string | null
  currentPhone:            string | null
  currentEmail:            string | null
  currentWebsite:          string | null
  currentBio:              string | null
  currentLicenseNumber:    string | null
  currentSpecialtyAirports: string[]
  currentAlertRadius:      number
  isVerified:              boolean
}

const RADIUS_OPTIONS = [
  { value: '0',    label: 'Off — no email alerts' },
  { value: '25',   label: 'Within 25 miles' },
  { value: '50',   label: 'Within 50 miles' },
  { value: '100',  label: 'Within 100 miles' },
  { value: '250',  label: 'Within 250 miles' },
  { value: '500',  label: 'Within 500 miles' },
  { value: '9999', label: 'Any distance' },
]

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
  currentBrokerage,
  currentPhone,
  currentEmail,
  currentWebsite,
  currentBio,
  currentLicenseNumber,
  currentSpecialtyAirports,
  currentAlertRadius,
  isVerified,
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
        {/* Company / Brokerage name — full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="bp-brokerage" style={labelStyle}>Company Name</label>
          <input
            id="bp-brokerage"
            name="brokerage"
            type="text"
            defaultValue={currentBrokerage ?? ''}
            placeholder="e.g. Seitz Aviation"
            style={inputStyle}
          />
        </div>

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

        {/* License number */}
        <div>
          <label htmlFor="bp-license" style={labelStyle}>
            Real Estate License #
            {isVerified && (
              <span style={{ marginLeft: '0.4rem', color: '#2563eb', fontWeight: '700' }}>✓ Verified</span>
            )}
          </label>
          <input
            id="bp-license"
            name="license_number"
            type="text"
            defaultValue={currentLicenseNumber ?? ''}
            placeholder="e.g. SA12345"
            style={inputStyle}
          />
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', color: '#9ca3af' }}>
            Submitted for verification — displays a Verified badge on your profile once approved
          </p>
        </div>

        {/* Specialty airports */}
        <div>
          <label htmlFor="bp-airports" style={labelStyle}>Specialty Airports</label>
          <input
            id="bp-airports"
            name="specialty_airports"
            type="text"
            defaultValue={currentSpecialtyAirports.join(', ')}
            placeholder="KBFI, KPAE, KSEA"
            style={inputStyle}
          />
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', color: '#9ca3af' }}>
            Comma-separated ICAO codes for your primary markets (up to 10)
          </p>
        </div>
      </div>

      {/* ── Notification Settings ────────────────────────────── */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem 1.25rem',
        border: '1px solid #e5e7eb',
        borderRadius: '9px',
        backgroundColor: '#f9fafb',
      }}>
        <p style={{
          margin: '0 0 0.75rem',
          fontSize: '0.75rem',
          fontWeight: '700',
          color: '#374151',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          Notification Settings
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
          <div>
            <label htmlFor="bp-alert-radius" style={labelStyle}>Hangar request alerts</label>
            <select
              id="bp-alert-radius"
              name="alert_radius_miles"
              defaultValue={String(currentAlertRadius)}
              style={inputStyle}
            >
              {RADIUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', color: '#9ca3af' }}>
              Get emailed + notified when a pilot posts a request within this radius of any of your specialty airports.
            </p>
          </div>
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
