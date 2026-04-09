'use client'

import { useActionState, useEffect, useRef } from 'react'
import { saveHomeAirport, type SettingsState } from './actions'

type Props = {
  currentAirport: string
}

const INITIAL: SettingsState = {}

const inputStyle: React.CSSProperties = {
  padding: '0.6rem 0.85rem',
  border: '1px solid #d1d5db',
  borderRadius: '7px',
  fontSize: '0.925rem',
  fontFamily: 'Arial, sans-serif',
  fontWeight: '600',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#111827',
  backgroundColor: 'white',
  outline: 'none',
  width: '140px',
  boxSizing: 'border-box' as const,
}

export default function SettingsForm({ currentAirport }: Props) {
  const [state, action, pending] = useActionState(saveHomeAirport, INITIAL)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus the input on mount so keyboard users can tab straight in
  useEffect(() => {
    if (!currentAirport) inputRef.current?.focus()
  }, [currentAirport])

  return (
    <form action={action}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <label
            htmlFor="home_airport"
            style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700',
                     color: '#374151', marginBottom: '0.4rem' }}
          >
            ICAO Code
          </label>
          <input
            ref={inputRef}
            id="home_airport"
            name="home_airport"
            type="text"
            defaultValue={currentAirport}
            placeholder="KBFI"
            maxLength={4}
            minLength={3}
            pattern="[A-Za-z0-9]{3,4}"
            autoComplete="off"
            spellCheck={false}
            disabled={pending}
            style={inputStyle}
            onInput={e => {
              // Auto-uppercase as you type
              const el = e.currentTarget
              const pos = el.selectionStart ?? el.value.length
              el.value = el.value.toUpperCase()
              el.setSelectionRange(pos, pos)
            }}
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          style={{
            padding: '0.6rem 1.25rem',
            backgroundColor: pending ? '#9ca3af' : '#1a3a5c',
            color: 'white',
            border: 'none',
            borderRadius: '7px',
            fontSize: '0.875rem',
            fontWeight: '700',
            fontFamily: 'Arial, sans-serif',
            cursor: pending ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { if (!pending) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#254e7a' }}
          onMouseLeave={e => { if (!pending) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1a3a5c' }}
        >
          {pending ? 'Saving…' : 'Save'}
        </button>

        {/* Clear button — only show if an airport is currently set */}
        {currentAirport && !state.success && (
          <button
            type="submit"
            name="home_airport"
            value=""
            disabled={pending}
            style={{
              padding: '0.6rem 1rem',
              backgroundColor: 'white',
              color: '#6b7280',
              border: '1px solid #d1d5db',
              borderRadius: '7px',
              fontSize: '0.875rem',
              fontFamily: 'Arial, sans-serif',
              cursor: pending ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fef2f2'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#dc2626'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'white'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#6b7280'
            }}
          >
            Clear
          </button>
        )}
      </div>

      <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
        Enter the 3–4 character ICAO code, e.g. KBFI, KSEA, KPAE, KAWO.
      </p>

      {/* Feedback */}
      {state.success && (
        <div style={{
          marginTop: '0.85rem',
          padding: '0.6rem 0.85rem',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '7px',
          fontSize: '0.85rem',
          color: '#166534',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {state.success}
          {' '}The widget in the nav will refresh on your next page load.
        </div>
      )}
      {state.error && (
        <div style={{
          marginTop: '0.85rem',
          padding: '0.6rem 0.85rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '7px',
          fontSize: '0.85rem',
          color: '#dc2626',
        }}>
          {state.error}
        </div>
      )}
    </form>
  )
}
