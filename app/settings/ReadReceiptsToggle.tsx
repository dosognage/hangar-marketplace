'use client'

import { useState, useTransition } from 'react'
import { supabase } from '@/lib/supabase'

export default function ReadReceiptsToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn]           = useState(enabled)
  const [isPending, startTransition] = useTransition()
  const [status, setStatus]   = useState<'idle' | 'saved' | 'error'>('idle')

  async function toggle() {
    const next = !on
    setOn(next)
    setStatus('idle')

    startTransition(async () => {
      const { error } = await supabase.auth.updateUser({
        data: { read_receipts_enabled: next },
      })

      if (error) {
        setOn(!next) // revert
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
          Send read receipts
        </p>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.5 }}>
          {on
            ? 'Others can see when you\'ve read their messages.'
            : 'Others cannot see when you\'ve read their messages.'}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
        {/* Status label */}
        {status === 'saved' && (
          <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600' }}>Saved</span>
        )}
        {status === 'error' && (
          <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '600' }}>Error</span>
        )}

        {/* Toggle pill */}
        <button
          onClick={toggle}
          disabled={isPending}
          aria-checked={on}
          role="switch"
          aria-label="Toggle read receipts"
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
          {/* Knob */}
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
