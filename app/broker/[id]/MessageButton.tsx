'use client'

import { openChat } from '@/app/components/ChatDrawer'

export default function MessageButton({
  brokerProfileId,
  brokerName,
  currentUserId,
}: {
  brokerProfileId: string
  brokerName: string
  currentUserId: string
}) {
  return (
    <button
      onClick={() => openChat({ brokerProfileId, brokerName, currentUserId })}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
        padding: '0.6rem 1.25rem',
        backgroundColor: '#6366f1', color: 'white',
        border: 'none', borderRadius: '8px',
        fontWeight: '600', fontSize: '0.875rem',
        cursor: 'pointer', transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#4f46e5')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#6366f1')}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      Message
    </button>
  )
}
