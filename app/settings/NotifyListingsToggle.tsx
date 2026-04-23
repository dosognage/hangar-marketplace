'use client'

import { useState, useTransition } from 'react'
import { saveNotifyNewListings } from './actions'

/**
 * Opt-out toggle for nearby-new-listing alerts. Mirrors ReadReceiptsToggle's
 * UX (optimistic flip, inline Saved/Error chip, server action on change).
 */
export default function NotifyListingsToggle({
  enabled,
  hasHomeAirport,
}: {
  enabled:        boolean
  hasHomeAirport: boolean
}) {
  const [on, setOn]                 = useState(enabled)
  const [isPending, startTransition] = useTransition()
  const [status, setStatus]         = useState<'idle' | 'saved' | 'error'>('idle')

  async function toggle() {
    const next = !on
    setOn(next)
    setStatus('idle')

    startTransition(async () => {
      const res = await saveNotifyNewListings(next)
      if (res.error) {
        setOn(!next)  // revert
        setStatus('error')
      } else {
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 2000)
      }
    })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
      <div>
        <p style={{ margin: '0 0 0.2rem', fontSize: '0.9rem', fontWeight: '600', color: '#111827' }}>
          Email me about new listings near my home airport
        </p>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.5 }}>
          {hasHomeAirport
            ? (on
                ? 'We\'ll send an email + in-app alert when a new listing drops within 50 miles.'
                : 'No alerts. You can turn this back on anytime.')
            : 'Set a home airport above to start receiving these alerts.'}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
        {status === 'saved' && (
          <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600' }}>Saved</span>
        )}
        {status === 'error' && (
          <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '600' }}>Error</span>
        )}

        <button
          onClick={toggle}
          disabled={isPending}
          aria-checked={on}
          role="switch"
          aria-label="Toggle new-listing alerts"
          style={{
            position: 'relative',
            width: '48px',
            height: '28px',
            borderRadius: '14px',
            border: 'none',
            cursor: isPending ? 'wait' : 'pointer',
            backgroundColor: on ? '#6366f1' : '#d1d5db',
            transition: 'background-color 0.2s ease',
            padding: 0,
            flexShrink: 0,
            outline: 'none',
          }}
        >
          <span style={{
            position: 'absolute',
            top: '3px',
            left: on ? '23px' : '3px',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            backgroundColor: 'white',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            transition: 'left 0.2s ease',
            display: 'block',
          }} />
        </button>
      </div>
    </div>
  )
}
