'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { saveSpecialtyStep } from '../actions'

type Props = {
  defaultAirports: string[]
}

export default function SpecialtyStepForm({ defaultAirports }: Props) {
  const [state, action, pending] = useActionState(saveSpecialtyStep, null)
  const [airports, setAirports] = useState<string[]>(defaultAirports)
  const [draft, setDraft] = useState('')

  function addAirport(raw: string) {
    const code = raw.trim().toUpperCase()
    if (!/^[A-Z0-9]{3,5}$/.test(code)) return
    if (airports.includes(code)) return
    if (airports.length >= 10) return
    setAirports(prev => [...prev, code])
    setDraft('')
  }

  function removeAirport(code: string) {
    setAirports(prev => prev.filter(c => c !== code))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault()
      addAirport(draft)
    } else if (e.key === 'Backspace' && draft === '' && airports.length > 0) {
      // Remove last on backspace from empty input — common chip-input UX.
      setAirports(prev => prev.slice(0, -1))
    }
  }

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Hidden field carrying the comma-separated list to the server action */}
      <input type="hidden" name="airports" value={airports.join(',')} />

      <label style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.45rem' }}>
          ICAO codes
        </span>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center',
          padding: '0.55rem 0.65rem',
          border: '1px solid #cbd5e1', borderRadius: '8px',
          backgroundColor: 'white',
          minHeight: '52px',
        }}>
          {airports.map(code => (
            <span key={code} style={chip}>
              {code}
              <button
                type="button"
                onClick={() => removeAirport(code)}
                aria-label={`Remove ${code}`}
                style={chipRemove}
              >×</button>
            </span>
          ))}
          <input
            value={draft}
            onChange={e => setDraft(e.target.value.toUpperCase().slice(0, 5))}
            onKeyDown={onKeyDown}
            placeholder={airports.length === 0 ? 'KAPA, KCRQ, KSEE' : 'Add another'}
            disabled={airports.length >= 10}
            style={{
              flex: 1, minWidth: '120px', border: 'none', outline: 'none',
              fontSize: '0.92rem', padding: '0.3rem 0.2rem',
              backgroundColor: 'transparent', color: '#0f172a',
            }}
          />
        </div>
        <span style={{ display: 'block', marginTop: '0.4rem', fontSize: '0.72rem', color: '#94a3b8' }}>
          {airports.length}/10 · Press Enter, comma, or space to add. ICAO codes are 3-5 alphanumeric characters (KAPA, KCRQ, etc.).
        </span>
      </label>

      {state?.error && (
        <div style={errorBox}>{state.error}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link href="/broker/setup/avatar" style={backLink}>← Back</Link>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <Link href="/broker/setup/preferences" style={skipBtn}>
            Skip for now
          </Link>
          <button type="submit" disabled={pending} style={primaryBtn(pending)}>
            {pending ? 'Saving…' : 'Save and continue →'}
          </button>
        </div>
      </div>
    </form>
  )
}

const chip: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
  padding: '0.22rem 0.5rem 0.22rem 0.65rem',
  fontSize: '0.78rem', fontWeight: 700,
  color: '#1e3a8a',
  backgroundColor: '#dbeafe', border: '1px solid #bfdbfe',
  borderRadius: '999px',
}
const chipRemove: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: '#1d4ed8', fontSize: '1rem', lineHeight: 1,
  padding: 0, marginLeft: '0.15rem',
}
const errorBox: React.CSSProperties = {
  padding: '0.65rem 0.85rem',
  backgroundColor: '#fef2f2', border: '1px solid #fecaca',
  borderRadius: '8px', color: '#dc2626', fontSize: '0.85rem',
}
const backLink: React.CSSProperties = { fontSize: '0.875rem', color: '#64748b', textDecoration: 'none' }
const skipBtn: React.CSSProperties = {
  padding: '0.7rem 1rem',
  color: '#64748b', textDecoration: 'none',
  fontSize: '0.875rem', fontWeight: 600,
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
