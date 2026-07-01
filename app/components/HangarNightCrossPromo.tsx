import Link from 'next/link'

/**
 * Cross-promo card pointing HangarMarketplace visitors to HangarNight
 * for overnight hangar rentals.
 *
 * Placement is context-sensitive: on airport pages we deep-link to the
 * HN airport search; on state/city pages we deep-link to the HN home
 * with a query that pre-filters. Same visual pattern is mirrored on HN
 * (see /app/hangar/[id]/page.tsx) pointing back to HM for buy/lease.
 *
 * The two variants (`context` prop) differ only in copy — same styling,
 * same visual weight. Both open in a new tab so the browsing session on
 * HM isn't interrupted.
 */

interface Props {
  /**
   * Where in the site tree this appears. Drives the copy — an airport
   * page can say "overnight at KAPA", a state page has to keep it
   * generic ("overnight anywhere in Colorado").
   */
  context: 'airport' | 'city' | 'state'
  /**
   * Airport ICAO (for context='airport') or place name (city/state).
   * Used in the headline copy.
   */
  label:   string
  /**
   * Deep-link href on hangarnight.com. Callers control this because
   * airport pages send ?query=ICAO whereas state/city pages either
   * pre-filter by state or land on the homepage.
   */
  hnHref:  string
}

export default function HangarNightCrossPromo({ context, label, hnHref }: Props) {
  const headline =
    context === 'airport' ? `Overnighting at ${label}?`
    : context === 'city'  ? `Visiting ${label}?`
    :                       `Traveling to ${label}?`

  const body =
    context === 'airport'
      ? `Book overnight hangar space at ${label} on HangarNight — pilots renting to pilots, from $50/night.`
      : `Book overnight hangar space at airports in ${label} on HangarNight — pilots renting to pilots.`

  return (
    <Link
      href={hnHref}
      target="_blank"
      rel="noopener"
      style={{
        display: 'block', padding: '1rem 1.15rem',
        backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
        borderRadius: '10px', textDecoration: 'none', color: 'inherit',
        marginBottom: '1.5rem',
      }}
    >
      <p style={{ margin: '0 0 0.25rem', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#1e40af' }}>
        Sister site
      </p>
      <p style={{ margin: '0 0 0.25rem', fontSize: '0.95rem', fontWeight: '700', color: '#111827' }}>
        {headline}
      </p>
      <p style={{ margin: 0, fontSize: '0.82rem', color: '#4b5563', lineHeight: 1.5 }}>
        {body} →
      </p>
    </Link>
  )
}
