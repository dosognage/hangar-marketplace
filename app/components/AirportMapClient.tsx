'use client'

/**
 * AirportMapClient — thin client wrapper around AirportMap.
 *
 * next/dynamic with ssr:false cannot be used in Server Components (Next.js 16+).
 * This 'use client' wrapper owns the dynamic import so server pages can simply
 * import AirportMapClient without violating that rule.
 */

import dynamic from 'next/dynamic'

const AirportMap = dynamic(() => import('./AirportMap'), { ssr: false })

export type AirportMapClientProps = {
  icao: string
  savedLat?: number | null
  savedLng?: number | null
  editable?: boolean
  onLocationSelect?: (lat: number, lng: number) => void
  height?: string
}

export default function AirportMapClient(props: AirportMapClientProps) {
  return <AirportMap {...props} />
}
