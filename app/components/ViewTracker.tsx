'use client'

import { useEffect } from 'react'

/**
 * Invisible component — fires a view ping once per browser session per listing.
 * Uses sessionStorage to avoid double-counting rapid refreshes.
 * Passes referrer + device info so the API can log them.
 */
export default function ViewTracker({ listingId }: { listingId: string }) {
  useEffect(() => {
    const key = `viewed_${listingId}`
    // Dedupe: only fire once per browser tab session
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')

    // Stable random ID for this tab session
    let sessionId = sessionStorage.getItem('analytics_session')
    if (!sessionId) {
      sessionId = Math.random().toString(36).slice(2)
      sessionStorage.setItem('analytics_session', sessionId)
    }

    fetch('/api/listings/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId,
        sessionId,
        referrer: document.referrer || null,
      }),
    }).catch(() => {/* non-critical */})
  }, [listingId])

  return null
}
