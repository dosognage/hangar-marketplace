'use client'

import { useState, useTransition } from 'react'
import { deleteListing } from '@/app/actions/listings'

export default function DeleteListingButton({ listingId }: { listingId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteListing(listingId)
      if (result?.error) setError(result.error)
    })
  }

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} style={deleteBtn}>
        Delete
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: '500' }}>
        Are you sure?
      </span>
      <button
        onClick={handleDelete}
        disabled={isPending}
        style={{ ...deleteBtn, backgroundColor: '#dc2626', color: 'white', borderColor: '#dc2626' }}
      >
        {isPending ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button onClick={() => setConfirming(false)} style={cancelBtn}>
        Cancel
      </button>
      {error && <span style={{ fontSize: '0.8rem', color: '#dc2626' }}>{error}</span>}
    </div>
  )
}

const deleteBtn: React.CSSProperties = {
  padding: '0.35rem 0.85rem',
  fontSize: '0.8rem',
  fontWeight: '600',
  borderRadius: '6px',
  border: '1px solid #fca5a5',
  backgroundColor: 'white',
  color: '#dc2626',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const cancelBtn: React.CSSProperties = {
  padding: '0.35rem 0.85rem',
  fontSize: '0.8rem',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  backgroundColor: 'white',
  color: '#6b7280',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}
