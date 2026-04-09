'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AcceptInviteButton({ token }: { token: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  async function handleAccept() {
    setStatus('loading')
    const res = await fetch('/api/team/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const data = await res.json()
    if (!res.ok) {
      setStatus('error')
      setErrorMsg(data.error ?? 'Something went wrong.')
    } else {
      setStatus('success')
      setTimeout(() => router.push('/team'), 1500)
    }
  }

  if (status === 'success') {
    return (
      <div style={{ color: '#16a34a', fontSize: '0.9rem', fontWeight: '600' }}>
        ✓ You've joined the team! Redirecting…
      </div>
    )
  }

  return (
    <>
      <button
        onClick={handleAccept}
        disabled={status === 'loading'}
        style={{
          padding: '0.65rem 1.75rem',
          backgroundColor: status === 'loading' ? '#93c5fd' : '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '7px',
          fontSize: '0.9rem',
          fontWeight: '700',
          cursor: status === 'loading' ? 'default' : 'pointer',
        }}
      >
        {status === 'loading' ? 'Accepting…' : 'Accept invitation'}
      </button>
      {status === 'error' && (
        <p style={{ marginTop: '0.75rem', color: '#dc2626', fontSize: '0.8rem' }}>{errorMsg}</p>
      )}
    </>
  )
}
