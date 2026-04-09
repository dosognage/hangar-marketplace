'use client'

/**
 * FavoriteButton
 *
 * Receives userId and initialSaved from the server (listing page).
 * Toggling calls a Server Action so auth is always cookie-based — no
 * client-side supabase.auth.getUser() required.
 */

import { useState, useTransition } from 'react'
import { toggleSavedListing } from '@/app/actions/listings'
import HeartIcon from './HeartIcon'
import { useToast } from './ToastProvider'

type Props = {
  listingId: string
  userId: string | null
  initialSaved: boolean
}

export default function FavoriteButton({ listingId, userId, initialSaved }: Props) {
  const [saved, setSaved] = useState(initialSaved)
  const [isPending, startTransition] = useTransition()
  const { addToast } = useToast()

  function handleClick() {
    if (!userId) {
      addToast('Sign in to save listings', 'info')
      return
    }
    startTransition(async () => {
      const result = await toggleSavedListing(listingId, saved)
      if (result && typeof result.saved === 'boolean') {
        setSaved(result.saved)
        addToast(result.saved ? 'Listing saved!' : 'Removed from saved', result.saved ? 'success' : 'info')
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      title={saved ? 'Remove from saved' : 'Save listing'}
      style={{
        background: 'none',
        border: 'none',
        padding: '0.25rem',
        cursor: isPending ? 'default' : 'pointer',
        opacity: isPending ? 0.5 : 1,
        transition: 'opacity 0.15s',
        display: 'flex',
        alignItems: 'center',
        color: saved ? '#dc2626' : '#9ca3af',
      }}
    >
      <HeartIcon filled={saved} size={22} />
    </button>
  )
}
