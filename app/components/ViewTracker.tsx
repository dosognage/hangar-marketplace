'use client'

import { useEffect } from 'react'

/**
 * Invisible component — fires a view-count ping once on mount.
 * Placed in the listing detail page (server component) so only
 * real browser visits are counted, not server-side renders or bots.
 */
export default function ViewTracker({ listingId }: { listingId: string }) {
  useEffect(() => {
    fetch('/api/listings/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId }),
    }).catch(() => {/* non-critical */})
  }, [listingId])

  return null
}
