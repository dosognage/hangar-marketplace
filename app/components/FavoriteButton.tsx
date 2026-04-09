'use client'

/**
 * FavoriteButton
 *
 * Heart button that toggles a listing in the user's saved_listings table.
 * Shows a filled heart if saved, outline if not.
 * If the user is not logged in, redirects to /login.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Props = {
  listingId: string
}

export default function FavoriteButton({ listingId }: Props) {
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)

      const { data } = await supabase
        .from('saved_listings')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
        .maybeSingle()

      setSaved(!!data)
      setLoading(false)
    }
    init()
  }, [listingId])

  async function toggle() {
    if (!userId) {
      router.push(`/login?next=/listing/${listingId}`)
      return
    }

    setLoading(true)
    if (saved) {
      await supabase
        .from('saved_listings')
        .delete()
        .eq('user_id', userId)
        .eq('listing_id', listingId)
      setSaved(false)
    } else {
      await supabase
        .from('saved_listings')
        .insert({ user_id: userId, listing_id: listingId })
      setSaved(true)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={saved ? 'Remove from saved' : 'Save listing'}
      style={{
        background: 'none',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        padding: '0.5rem 0.85rem',
        cursor: loading ? 'default' : 'pointer',
        fontSize: '1.1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        color: saved ? '#dc2626' : '#6b7280',
        fontWeight: '500',
        fontSize: '0.875rem',
        backgroundColor: saved ? '#fef2f2' : 'white',
        borderColor: saved ? '#fca5a5' : '#d1d5db',
        transition: 'all 0.15s',
      }}
    >
      {saved ? '❤️' : '🤍'} {saved ? 'Saved' : 'Save'}
    </button>
  )
}
