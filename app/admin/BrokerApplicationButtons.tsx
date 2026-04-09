'use client'

import { useState } from 'react'
import { approveBrokerApplication, rejectBrokerApplication } from '@/app/actions/broker'

type Props = {
  applicationId: string
  userId: string
}

export default function BrokerApplicationButtons({ applicationId, userId }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'approved' | 'rejected'>('idle')

  async function handleApprove() {
    setStatus('loading')
    await approveBrokerApplication(applicationId, userId)
    setStatus('approved')
  }

  async function handleReject() {
    setStatus('loading')
    await rejectBrokerApplication(applicationId)
    setStatus('rejected')
  }

  if (status === 'approved') {
    return <span style={pill('#dcfce7', '#166534')}>✓ Approved</span>
  }
  if (status === 'rejected') {
    return <span style={pill('#fee2e2', '#991b1b')}>✕ Rejected</span>
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
      <button
        onClick={handleApprove}
        disabled={status === 'loading'}
        style={{
          padding: '0.45rem 1rem', backgroundColor: '#166534', color: 'white',
          border: 'none', borderRadius: '6px', fontWeight: '600',
          fontSize: '0.875rem', cursor: 'pointer',
        }}
      >
        Approve
      </button>
      <button
        onClick={handleReject}
        disabled={status === 'loading'}
        style={{
          padding: '0.45rem 1rem', backgroundColor: 'white', color: '#991b1b',
          border: '1px solid #fca5a5', borderRadius: '6px', fontWeight: '600',
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
    borderRadius: '999px', fontSize: '0.8rem', fontWeight: '700',
    backgroundColor: bg, color,
  }
}
