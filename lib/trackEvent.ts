/**
 * Fire-and-forget listing analytics event from the browser.
 * Safe to call anywhere in client components — never throws.
 */
export function trackEvent(
  listingId: string,
  eventType:
    | 'contact_click'
    | 'phone_click'
    | 'email_click'
    | 'save'
    | 'unsave'
    | 'share'
    | 'photo_view'
    | 'map_view',
  metadata?: Record<string, unknown>
) {
  fetch('/api/listings/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listingId, eventType, metadata }),
  }).catch(() => {/* non-critical */})
}
