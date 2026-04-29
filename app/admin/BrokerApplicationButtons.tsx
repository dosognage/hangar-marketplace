'use client'

import { useState } from 'react'
import { approveBrokerApplication, rejectBrokerApplication } from '@/app/actions/broker'

type Props = {
  applicationId: string
  userId: string
}

type Mode = 'idle' | 'confirming' | 'loading' | 'approved' | 'rejected'

export default function BrokerApplicationButtons({ applicationId, userId }: Props) {
  const [mode, setMode] = useState<Mode>('idle')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Two-step approve: reveal a password field, then confirm. Reject stays
  // one-click since it doesn't grant any new privileges (an accidental reject
  // is recoverable; an accidental approve is messier to unwind).
  async function handleConfirmApprove(e: React.FormEvent) {
    e.preventDefault()
    setMode('loading')
    setError(null)
    const res = await approveBrokerApplication(applicationId, userId, password)
    if (!res.ok) {
      setError(res.error)
      setMode('confirming')  // stay on the password step so they can retry
      return
    }
    setPassword('')
    setMode('approved')
  }

  async function handleReject() {
    setMode('loading')
    await rejectBrokerApplication(applicationId)
    setMode('rejected')
  }

  if (mode === 'approved') return <span style={pill('#dcfce7', '#166534')}>✓ Approved</span>
  if (mode === 'rejected') return <span style={pill('#fee2e2', '#991b1b')}>✕ Rejected</span>

  if (mode === 'confirming' || mode === 'loading') {
    return (
      <form onSubmit={handleConfirmApprove} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="password"
          autoFocus
          required
          placeholder="Your password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={mode === 'loading'}
          style={{
            padding: '0.4rem 0.65rem', border: '1px solid #d1d5db',
            borderRadius: '6px', fontSize: '0.875rem', minWidth: '180px',
          }}
        />
        <button
          type="submit"
          disabled={mode === 'loading' || !password}
          style={{
            padding: '0.45rem 1rem', backgroundColor: '#166534', color: 'white',
            border: 'none', borderRadius: '6px', fontWeight: 600,
            fontSize: '0.875rem', cursor: 'pointer', opacity: mode === 'loading' || !password ? 0.6 : 1,
          }}
        >
          {mode === 'loading' ? 'Approving…' : 'Confirm approve'}
        </button>
        <button
          type="button"
          onClick={() => { setMode('idle'); setPassword(''); setError(null) }}
          disabled={mode === 'loading'}
          style={{
            padding: '0.45rem 0.85rem', backgroundColor: 'white', color: '#374151',
            border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 500,
            fontSize: '0.875rem', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        {error && <span style={{ color: '#dc2626', fontSize: '0.8rem' }}>{error}</span>}
      </form>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
      <button
        onClick={() => setMode('confirming')}
        style={{
          padding: '0.45rem 1rem', backgroundColor: '#166534', color: 'white',
          border: 'none', borderRadius: '6px', fontWeight: 600,
          fontSize: '0.875rem', cursor: 'pointer',
        }}
      >
        Approve
      </button>
      <button
        onClick={handleReject}
        style={{
          padding: '0.45rem 1rem', backgroundColor: 'white', color: '#991b1b',
          border: '1px solid #fca5a5', borderRadius: '6px', fontWeight: 600,
          fontSize: '0.875rem', cursor: 'pointer',
        }}
      >
        Reject
      </button>
    </div>
  )
}

function pill(bg: string, color: string): React.CSSProperties {
  return {
    display: 'inline-block', padding: '0.35rem 0.85rem',
    borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700,
    backgroundColor: bg, color,
  }
}
