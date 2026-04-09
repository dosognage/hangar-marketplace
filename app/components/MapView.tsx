'use client'

/**
 * MapView — Leaflet map with listing markers.
 *
 * Must be loaded with next/dynamic + ssr:false because Leaflet
 * accesses the browser's window object at import time.
 *
 * Markers are blue for sale listings and green for lease.
 * The hovered listing's marker pulses with a highlight ring.
 * Clicking a marker scrolls the matching card into view.
 */

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet's default icon paths which break in webpack / Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom coloured markers
function makeIcon(color: 'blue' | 'green' | 'gold') {
  const colors = {
    blue:  { bg: '#2563eb', border: '#1d4ed8' },
    green: { bg: '#16a34a', border: '#15803d' },
    gold:  { bg: '#d97706', border: '#b45309' },
  }
  const c = colors[color]
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 24 14 24S28 23.33 28 14C28 6.27 21.73 0 14 0z"
        fill="${c.bg}" stroke="${c.border}" stroke-width="1.5"/>
      <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
    </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -40],
  })
}

const ICON_SALE     = makeIcon('blue')
const ICON_LEASE    = makeIcon('green')
const ICON_HOVERED  = makeIcon('gold')

export type MapListing = {
  id: string
  title: string
  city: string
  state: string
  airport_code: string
  listing_type: string
  asking_price: number | null
  monthly_lease: number | null
  latitude: number
  longitude: number
}

type Props = {
  listings: MapListing[]
  hoveredId: string | null
  onMarkerClick: (id: string) => void
}

// Auto-fit the map bounds whenever listings change
function BoundsUpdater({ listings }: { listings: MapListing[] }) {
  const map = useMap()
  const fitted = useRef(false)

  useEffect(() => {
    if (fitted.current || listings.length === 0) return
    const bounds = L.latLngBounds(listings.map((l) => [l.latitude, l.longitude]))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 })
    fitted.current = true
  }, [listings, map])

  return null
}

// Forces the map to recalculate its size after the container fully paints.
function InvalidateSize() {
  const map = useMap()
  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 50)
    return () => clearTimeout(id)
  }, [map])
  return null
}

export default function MapView({ listings, hoveredId, onMarkerClick }: Props) {
  // Only render Leaflet after the browser has finished its first paint.
  // This prevents "this.getPane().appendChild" and "container reused" errors.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const mapped = listings.filter((l) => l.latitude && l.longitude)

  const center: [number, number] =
    mapped.length > 0
      ? [mapped[0].latitude, mapped[0].longitude]
      : [39.5, -98.35] // centre of USA as default

  if (!mounted) {
    return (
      <div style={{ width: '100%', height: '100%', backgroundColor: '#e5e7eb' }} />
    )
  }

  return (
    <MapContainer
      key="hangar-map"
      center={center}
      zoom={5}
      style={{ width: '100%', height: '100%', minHeight: '400px', borderRadius: '0' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <BoundsUpdater listings={mapped} />
      <InvalidateSize />

      {mapped.map((listing) => {
        const isHovered = listing.id === hoveredId
        const icon = isHovered
          ? ICON_HOVERED
          : listing.listing_type === 'lease'
            ? ICON_LEASE
            : ICON_SALE

        const price = listing.asking_price
          ? `$${listing.asking_price.toLocaleString()}`
          : listing.monthly_lease
            ? `$${listing.monthly_lease.toLocaleString()}/mo`
            : 'Contact for price'

        return (
          <Marker
            key={listing.id}
            position={[listing.latitude, listing.longitude]}
            icon={icon}
            eventHandlers={{ click: () => onMarkerClick(listing.id) }}
            zIndexOffset={isHovered ? 1000 : 0}
          >
            <Popup>
              <div style={{ minWidth: '180px', fontFamily: 'Arial, sans-serif' }}>
                <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '14px', lineHeight: 1.3 }}>
                  {listing.title}
                </p>
                <p style={{ margin: '0 0 2px', color: '#6b7280', fontSize: '12px' }}>
                  {listing.airport_code} · {listing.city}, {listing.state}
                </p>
                <p style={{ margin: '0 0 8px', fontWeight: '600', fontSize: '14px', color: '#111827' }}>
                  {price}
                </p>
                <a
                  href={`/listing/${listing.id}`}
                  style={{
                    display: 'inline-block',
                    padding: '5px 12px',
                    backgroundColor: '#111827',
                    color: 'white',
                    borderRadius: '5px',
                    textDecoration: 'none',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  View listing →
                </a>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
