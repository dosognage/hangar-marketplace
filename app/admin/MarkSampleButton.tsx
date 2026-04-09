'use client'

import { useState } from 'react'

type Props = {
  listingId: string
  isSample: boolean
}

export default function MarkSampleButton({ listingId, isSample }: Props) {
  const [current, setCurrent] = useState(isSample)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/mark-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, isSample: !current }),
      })
      if (res.ok) setCurrent(v => !v)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      style={{
        padding: '0.4rem 0.85rem',
        fontSize: '0.8rem',
        fontWeight: '600',
        borderRadius: '6px',
        border: `1.5px solid ${current ? '#f59e0b' : '#d1d5db'}`,
        backgroundColor: current ? '#fffbeb' : 'white',
        color: current ? '#92400e' : '#374151',
        cursor: loading ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {loading ? '…' : current ? '🔍 Sample (click to unmark)' : 'Mark as sample'}
    </button>
  )
}
