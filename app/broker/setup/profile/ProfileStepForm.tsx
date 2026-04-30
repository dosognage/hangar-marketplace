'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { saveProfileStep } from '../actions'

type Props = {
  defaultBrokerage: string
  defaultPhone:     string
  defaultEmail:     string
  defaultBio:       string
  defaultWebsite:   string
}

export default function ProfileStepForm(props: Props) {
  const [state, action, pending] = useActionState(saveProfileStep, null)

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Field label="Brokerage" required>
        <input
          name="brokerage"
          required
          defaultValue={props.defaultBrokerage}
          placeholder="e.g. Sotheby's International Realty"
          style={input}
        />
      </Field>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <Field label="Phone" required>
          <input
            name="phone"
            type="tel"
            required
            defaultValue={props.defaultPhone}
            placeholder="(555) 555-1234"
            style={input}
          />
        </Field>
        <Field label="Contact email" required hint="Where buyer inquiries will land">
          <input
            name="contact_email"
            type="email"
            required
            defaultValue={props.defaultEmail}
            placeholder="you@brokerage.com"
            style={input}
          />
        </Field>
      </div>

      <Field label="Website" hint="Your brokerage page or personal site (optional)">
        <input
          name="website"
          type="url"
          defaultValue={props.defaultWebsite}
          placeholder="https://yourbrokerage.com"
          style={input}
        />
      </Field>

      <Field label="Bio" required hint="2-3 sentences. Pilots relate to pilots — mention any aviation background.">
        <textarea
          name="bio"
          required
          minLength={10}
          rows={5}
          defaultValue={props.defaultBio}
          placeholder="Aviation real estate specialist with 15 years brokering hangar properties across the western US. Pilot since 2009. Focus on Bonanza-class and larger turboprops..."
          style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }}
        />
      </Field>

      {state?.error && (
        <div style={errorBox}>{state.error}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
        <Link href="/broker/setup" style={backLink}>← Back</Link>
        <button type="submit" disabled={pending} style={primaryBtn(pending)}>
          {pending ? 'Saving…' : 'Save and continue →'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{
        display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155',
        marginBottom: '0.35rem',
      }}>
        {label}{required && <span style={{ color: '#dc2626', marginLeft: '0.2rem' }}>*</span>}
      </span>
      {children}
      {hint && <span style={{ display: 'block', marginTop: '0.3rem', fontSize: '0.72rem', color: '#94a3b8' }}>{hint}</span>}
    </label>
  )
}

const input: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '0.65rem 0.85rem',
  fontSize: '0.92rem', color: '#0f172a',
  border: '1px solid #cbd5e1', borderRadius: '8px',
  outline: 'none', backgroundColor: 'white',
}
const errorBox: React.CSSProperties = {
  padding: '0.65rem 0.85rem',
  backgroundColor: '#fef2f2', border: '1px solid #fecaca',
  borderRadius: '8px', color: '#dc2626', fontSize: '0.85rem',
}
const backLink: React.CSSProperties = {
  fontSize: '0.875rem', color: '#64748b', textDecoration: 'none',
}
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
