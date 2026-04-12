'use client'

import { useToast } from './ToastProvider'
import { trackEvent } from '@/lib/trackEvent'

type Props = {
  title: string
  listingId?: string
}

export default function ShareButton({ title, listingId }: Props) {
  const { addToast } = useToast()

  async function handleShare() {
    const url = window.location.href
    if (listingId) trackEvent(listingId, 'share')

    // Use native share sheet on mobile if available
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // User cancelled — no-op
        return
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url)
      addToast('Link copied to clipboard!', 'success')
    } catch {
      addToast('Could not copy link', 'error')
    }
  }

  return (
    <button
      onClick={handleShare}
      title="Share this listing"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.35rem 0.85rem',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        backgroundColor: 'white',
        color: '#374151',
        fontSize: '0.825rem',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fafb')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'white')}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/>
        <circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
      Share
    </button>
  )
}
