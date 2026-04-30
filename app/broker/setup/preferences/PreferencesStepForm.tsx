'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Bell, Mail } from 'lucide-react'
import { savePreferencesStep } from '../actions'

type Props = {
  defaultAlertRadius: number
  defaultHideEmail:   boolean
  defaultSubscribe:   boolean
}

const RADIUS_OPTIONS = [25, 50, 100, 250, 500, 1000]

export default function PreferencesStepForm(props: Props) {
  const [state, action, pending] = useActionState(savePreferencesStep, null)
  const [radius, setRadius] = useState(props.defaultAlertRadius)
  const [hideEmail, setHideEmail] = useState(props.defaultHideEmail)
  const [subscribe, setSubscribe] = useState(props.defaultSubscribe)

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── Alert radius — segmented selector ────────────────────────── */}
      <section>
        <div style={sectionHead}>
          <span style={iconBadge}><Bell size={16} strokeWidth={1.75} /></span>
          <div>
            <p style={sectionTitle}>Alert radius</p>
            <p style={sectionHint}>How far from your specialty airports should we ping you when a pilot posts a new request?</p>
          </div>
        </div>
        <input type="hidden" name="alert_radius_miles" value={radius} />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.5rem',
          marginTop: '0.85rem',
        }}>
          {RADIUS_OPTIONS.map(opt => {
            const active = radius === opt
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setRadius(opt)}
                style={{
                  padding: '0.65rem 0.5rem',
                  border: active ? '2px solid #1d4ed8' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  backgroundColor: active ? '#eff6ff' : 'white',
                  fontSize: '0.85rem',
                  fontWeight: active ? 700 : 500,
                  color: active ? '#1d4ed8' : '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
              >
                {opt} mi
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Email visibility toggle ─────────────────────────────────── */}
      <section>
        <label style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', cursor: 'pointer' }}>
          <input
            type="checkbox"
            name="hide_email"
            checked={hideEmail}
            onChange={e => setHideEmail(e.target.checked)}
            style={{ marginTop: '0.2rem', width: '18px', height: '18px', accentColor: '#1d4ed8' }}
          />
          <div>
            <p style={sectionTitle}>Hide my email on my public profile</p>
            <p style={sectionHint}>
              Buyers will see your phone + a contact form, but not your email address. Useful if you prefer phone leads or want to reduce spam.
            </p>
          </div>
        </label>
      </section>

      {/* ── Newsletter opt-in (the headline ask) ────────────────────── */}
      <section style={{
        background: 'linear-gradient(135deg, #f0f9ff, #ecfeff)',
        border: '1px solid #bfdbfe',
        borderRadius: '12px',
        padding: '1.1rem 1.2rem',
      }}>
        <label style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', cursor: 'pointer' }}>
          <input
            type="checkbox"
            name="subscribe_market_scan"
            checked={subscribe}
            onChange={e => setSubscribe(e.target.checked)}
            style={{ marginTop: '0.2rem', width: '18px', height: '18px', accentColor: '#1d4ed8' }}
          />
          <div>
            <p style={{ ...sectionTitle, fontSize: '0.95rem', color: '#1e3a8a', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
              <Mail size={16} strokeWidth={1.75} />
              <span>Send me the weekly market intelligence newsletter</span>
            </p>
            <p style={{ ...sectionHint, color: '#1e40af' }}>
              Every Monday morning, a digest of aviation real estate signals: new airpark sales, FAA airport news, market shifts. Free for verified brokers. Unsubscribe any time.
            </p>
          </div>
        </label>
      </section>

      {state?.error && <div style={errorBox}>{state.error}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
        <Link href="/broker/setup/specialty" style={backLink}>← Back</Link>
        <button type="submit" disabled={pending} style={primaryBtn(pending)}>
          {pending ? 'Saving…' : 'Save and continue →'}
        </button>
      </div>
    </form>
  )
}

const sectionHead: React.CSSProperties = {
  display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
}
const iconBadge: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: '32px', height: '32px', borderRadius: '8px',
  backgroundColor: '#eff6ff', color: '#1d4ed8',
  border: '1px solid #dbeafe',
  flexShrink: 0,
}
const sectionTitle: React.CSSProperties = {
  margin: '0 0 0.15rem', fontSize: '0.92rem', fontWeight: 700, color: '#0f172a',
}
const sectionHint: React.CSSProperties = {
  margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5,
}
const errorBox: React.CSSProperties = {
  padding: '0.65rem 0.85rem',
  backgroundColor: '#fef2f2', border: '1px solid #fecaca',
  borderRadius: '8px', color: '#dc2626', fontSize: '0.85rem',
}
const backLink: React.CSSProperties = { fontSize: '0.875rem', color: '#64748b', textDecoration: 'none' }
function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '0.7rem 1.4rem',
    background: disabled ? '#94a3b8' : 'linear-gradient(135deg, #1d4ed8, #2563eb)',
    color: 'white', fontWeight: 700, fontSize: '0.9rem',
    border: 'none', borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: disabled ? 'none' : '0 4px 12px rgba(29,78,216,0.25)',
  }
}
