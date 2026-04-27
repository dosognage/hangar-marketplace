'use client'

/**
 * "Can't find my aircraft?" widget — sits below the AircraftSelector and
 * gives users two paths when their plane isn't in our 190-aircraft dataset:
 *
 *   1. Report it     → fires off a request to admin (Andre) via email and
 *                       logs the request to aircraft_requests for follow-up.
 *   2. Add it custom → user types name + wingspan + length + tail height,
 *                       saved on user_preferences and used by the homepage
 *                       fit pill exactly like a dataset aircraft.
 *
 * Both forms are hidden by default; the user expands one or the other.
 */

import { useState, useTransition } from 'react'
import { saveCustomAircraft, reportMissingAircraft } from '@/app/actions/aircraft'

type Mode = 'idle' | 'report' | 'custom'

export default function CantFindAircraftWidget({
  onCustomSaved,
}: {
  onCustomSaved?: () => void
}) {
  const [mode, setMode] = useState<Mode>('idle')

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
          Can&apos;t find your aircraft?
        </span>
        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
          Pick one and we&apos;ll get you set.
        </span>
      </div>

      <div style={tabsStyle}>
        <button
          type="button"
          onClick={() => setMode(mode === 'report' ? 'idle' : 'report')}
          style={tabButtonStyle(mode === 'report')}
        >
          Report it to us
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === 'custom' ? 'idle' : 'custom')}
          style={tabButtonStyle(mode === 'custom')}
        >
          Add it manually
        </button>
      </div>

      {mode === 'report' && <ReportForm onDone={() => setMode('idle')} />}
      {mode === 'custom' && <CustomForm onDone={() => { setMode('idle'); onCustomSaved?.() }} />}
    </div>
  )
}

// ── Sub-form: Report missing aircraft ──────────────────────────────────────

function ReportForm({ onDone }: { onDone: () => void }) {
  const [manufacturer, setManufacturer] = useState('')
  const [model, setModel]               = useState('')
  const [notes, setNotes]               = useState('')
  const [isPending, startTransition]    = useTransition()
  const [status, setStatus]             = useState<'idle' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg]         = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('idle')
    setErrorMsg('')
    startTransition(async () => {
      const res = await reportMissingAircraft({ manufacturer, model, notes })
      if (res.error) {
        setStatus('error')
        setErrorMsg(res.error)
      } else {
        setStatus('sent')
        setTimeout(() => onDone(), 1800)
      }
    })
  }

  if (status === 'sent') {
    return (
      <div style={successBoxStyle}>
        ✓ Got it. We&apos;ll add this aircraft and email you when it&apos;s in the list.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={twoColStyle}>
        <Field label="Manufacturer">
          <input
            type="text"
            value={manufacturer}
            onChange={e => setManufacturer(e.target.value)}
            placeholder="e.g., Pilatus"
            style={inputStyle}
          />
        </Field>
        <Field label="Model *">
          <input
            type="text"
            value={model}
            onChange={e => setModel(e.target.value)}
            placeholder="e.g., PC-6 Porter"
            required
            style={inputStyle}
          />
        </Field>
      </div>
      <Field label="Notes (optional)">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Modifications, year, anything that helps us add it accurately"
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' as const }}
        />
      </Field>
      {errorMsg && <p style={{ margin: 0, fontSize: '0.8rem', color: '#dc2626' }}>{errorMsg}</p>}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" disabled={isPending} style={primaryBtnStyle}>
          {isPending ? 'Sending…' : 'Send request'}
        </button>
        <button type="button" onClick={onDone} style={cancelBtnStyle}>Cancel</button>
      </div>
    </form>
  )
}

// ── Sub-form: Custom aircraft entry ────────────────────────────────────────

function CustomForm({ onDone }: { onDone: () => void }) {
  const [name, setName]         = useState('')
  const [wingspan, setWingspan] = useState('')
  const [length, setLength]     = useState('')
  const [height, setHeight]     = useState('')
  const [isPending, startTransition] = useTransition()
  const [status, setStatus]     = useState<'idle' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('idle')
    setErrorMsg('')

    const parsed = {
      name,
      wingspan_ft: parseFloat(wingspan),
      length_ft:   parseFloat(length),
      height_ft:   parseFloat(height),
    }

    startTransition(async () => {
      const res = await saveCustomAircraft(parsed)
      if (res.error) {
        setStatus('error')
        setErrorMsg(res.error)
      } else {
        setStatus('saved')
        setTimeout(() => onDone(), 1500)
      }
    })
  }

  if (status === 'saved') {
    return (
      <div style={successBoxStyle}>
        ✓ Saved. Your custom aircraft is now active in the fit filter.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <Field label="Aircraft name *">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g., Pilatus PC-6 Porter (modified)"
          required
          style={inputStyle}
        />
      </Field>
      <div style={threeColStyle}>
        <Field label="Wingspan (ft) *">
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={wingspan}
            onChange={e => setWingspan(e.target.value)}
            placeholder="49.7"
            required
            style={inputStyle}
          />
        </Field>
        <Field label="Length (ft) *">
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={length}
            onChange={e => setLength(e.target.value)}
            placeholder="36.1"
            required
            style={inputStyle}
          />
        </Field>
        <Field label="Tail height (ft) *">
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={height}
            onChange={e => setHeight(e.target.value)}
            placeholder="10.5"
            required
            style={inputStyle}
          />
        </Field>
      </div>
      <p style={hintStyle}>
        Use manufacturer-published nominal values. The fit filter applies a
        small clearance buffer automatically, so you don&apos;t need to pad.
      </p>
      {errorMsg && <p style={{ margin: 0, fontSize: '0.8rem', color: '#dc2626' }}>{errorMsg}</p>}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" disabled={isPending} style={primaryBtnStyle}>
          {isPending ? 'Saving…' : 'Save aircraft'}
        </button>
        <button type="button" onClick={onDone} style={cancelBtnStyle}>Cancel</button>
      </div>
    </form>
  )
}

// ── Layout helpers ─────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <label style={fieldLabelStyle}>{label}</label>
      {children}
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  marginTop: '1rem',
  padding: '0.9rem 1rem',
  backgroundColor: '#fafafa',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.1rem',
}

const tabsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap',
}

const tabButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: '0.45rem 0.85rem',
  borderRadius: '7px',
  border: `1px solid ${active ? '#6366f1' : '#d1d5db'}`,
  backgroundColor: active ? '#eef2ff' : 'white',
  color: active ? '#4338ca' : '#374151',
  fontSize: '0.82rem',
  fontWeight: 600,
  cursor: 'pointer',
})

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.55rem',
  padding: '0.85rem',
  backgroundColor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
}

const twoColStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '0.55rem',
}

const threeColStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
  gap: '0.55rem',
}

const fieldLabelStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  fontWeight: 600,
  color: '#6b7280',
}

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.65rem',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.875rem',
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'inherit',
}

const hintStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '0.74rem',
  color: '#9ca3af',
  lineHeight: 1.5,
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  backgroundColor: '#0f172a',
  color: 'white',
  border: 'none',
  borderRadius: '7px',
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'pointer',
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  backgroundColor: 'white',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: '7px',
  fontSize: '0.85rem',
  fontWeight: 500,
  cursor: 'pointer',
}

const successBoxStyle: React.CSSProperties = {
  padding: '0.7rem 0.95rem',
  backgroundColor: '#ecfdf5',
  border: '1px solid #a7f3d0',
  color: '#065f46',
  borderRadius: '8px',
  fontSize: '0.85rem',
}
