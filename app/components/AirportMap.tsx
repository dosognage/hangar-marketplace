'use client'

/**
 * AirportMap — Interactive airport diagram using OpenStreetMap / Overpass API.
 *
 * Given an ICAO code, fetches aeroway geometry (runways, taxiways, aprons, etc.)
 * from the Overpass API and renders them on a Leaflet map with no tile background,
 * so the airport layout is the star of the show.
 *
 * In editable mode, clicking anywhere on the map places/moves a marker that
 * represents the hangar location. The parent receives the lat/lng via onLocationSelect.
 *
 * Must be loaded with next/dynamic + ssr:false because Leaflet requires window.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, useMap, useMapEvents } from 'react-leaflet'
import L, { LatLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ── Leaflet default-icon fix (same as MapView) ────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ── Hangar pin icon ───────────────────────────────────────────────────────────
const HANGAR_ICON = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">
    <path d="M16 0C7.16 0 0 7.16 0 16c0 10.67 16 28 16 28S32 26.67 32 16C32 7.16 24.84 0 16 0z"
      fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5"/>
    <rect x="8" y="11" width="16" height="10" rx="1" fill="white" opacity="0.95"/>
    <path d="M8 13 Q16 8 24 13" fill="white" opacity="0.95" stroke="none"/>
    <rect x="13" y="15" width="6" height="6" rx="0.5" fill="#2563eb"/>
  </svg>`,
  className: '',
  iconSize: [32, 44],
  iconAnchor: [16, 44],
  popupAnchor: [0, -46],
})

// ── Overpass types ────────────────────────────────────────────────────────────
type OverpassNode = { type: 'node'; id: number; lat: number; lon: number }
type OverpassWay  = { type: 'way'; id: number; nodes: number[]; tags?: Record<string, string> }
type OverpassElement = OverpassNode | OverpassWay

type GeoJSONFeature = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.LineString>

// ── Aeroway layer style config ────────────────────────────────────────────────
function aeroStyle(aeroway: string): L.PathOptions {
  switch (aeroway) {
    case 'runway':
      return { color: '#1f2937', fillColor: '#1f2937', fillOpacity: 1, weight: 0, fill: true }
    case 'taxiway':
    case 'taxilane':
      return { color: '#4b5563', weight: 6, fill: false }
    case 'apron':
    case 'parking_position':
      return { color: '#9ca3af', fillColor: '#d1d5db', fillOpacity: 0.6, weight: 1, fill: true }
    case 'terminal':
    case 'hangar':
      return { color: '#93c5fd', fillColor: '#bfdbfe', fillOpacity: 0.7, weight: 1, fill: true }
    default:
      return { color: '#d1d5db', fillColor: '#e5e7eb', fillOpacity: 0.4, weight: 1, fill: true }
  }
}

// ── Convert Overpass nodes+ways to GeoJSON ────────────────────────────────────
function overpassToGeoJSON(elements: OverpassElement[]): GeoJSONFeature[] {
  const nodeMap = new Map<number, [number, number]>()
  for (const el of elements) {
    if (el.type === 'node') nodeMap.set(el.id, [el.lon, el.lat])
  }

  const features: GeoJSONFeature[] = []
  for (const el of elements) {
    if (el.type !== 'way') continue
    const coords = el.nodes.map(nid => nodeMap.get(nid)).filter((c): c is [number, number] => !!c)
    if (coords.length < 2) continue

    const aeroway = el.tags?.aeroway ?? 'unknown'
    const isClosed = el.nodes[0] === el.nodes[el.nodes.length - 1] && coords.length >= 4

    if (isClosed) {
      features.push({
        type: 'Feature',
        properties: { aeroway },
        geometry: { type: 'Polygon', coordinates: [coords] },
      })
    } else {
      features.push({
        type: 'Feature',
        properties: { aeroway },
        geometry: { type: 'LineString', coordinates: coords },
      })
    }
  }
  return features
}

// ── Helper: auto-fit map to GeoJSON bounds ────────────────────────────────────
function FitBounds({ bounds }: { bounds: LatLngBounds | null }) {
  const map = useMap()
  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 })
    }
  }, [bounds, map])
  return null
}

// ── Helper: nudge Leaflet to recalculate its container size ───────────────────
//
// Leaflet caches the container's width/height on first render. If the map
// mounts inside a flex/grid layout that hasn't settled yet (common with
// dynamic imports), it caches 0x0 and tiles never paint until something
// triggers a resize. invalidateSize() forces a recalc.
//
// We hit it on mount, again after a tick (lets layout settle), and on every
// window resize for safety.
function InvalidateSizeOnMount() {
  const map = useMap()
  useEffect(() => {
    const fire = () => map.invalidateSize()
    fire()
    const t1 = setTimeout(fire, 50)
    const t2 = setTimeout(fire, 250)
    window.addEventListener('resize', fire)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('resize', fire)
    }
  }, [map])
  return null
}

// ── Helper: center map at a point (used for tile fallback) ────────────────────
function CenterMap({ lat, lng, zoom = 14 }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], zoom)
  // Only run when the coords actually change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])
  return null
}

// ── Helper: handle click-to-place marker in editable mode ─────────────────────
function ClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// ── Load state ────────────────────────────────────────────────────────────────
type LoadState = 'idle' | 'loading' | 'loaded' | 'notfound' | 'error'

// ── Props ─────────────────────────────────────────────────────────────────────
type Props = {
  icao: string
  savedLat?: number | null
  savedLng?: number | null
  /** Fallback center coords (e.g. from auto-geocode) used when no OSM aerodrome area is found */
  centerLat?: number | null
  centerLng?: number | null
  editable?: boolean
  onLocationSelect?: (lat: number, lng: number) => void
  height?: string
  /** Hide the +/− zoom buttons on mobile screens (≤768 px). Defaults to false. */
  hideZoomMobile?: boolean
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AirportMap({
  icao,
  savedLat,
  savedLng,
  centerLat,
  centerLng,
  editable = false,
  onLocationSelect,
  height = '420px',
  hideZoomMobile = false,
}: Props) {
  const [mounted, setMounted]             = useState(false)
  const [loadState, setLoadState]         = useState<LoadState>('idle')
  const [features, setFeatures]           = useState<GeoJSONFeature[]>([])
  const [bounds, setBounds]               = useState<LatLngBounds | null>(null)
  const [markerPos, setMarkerPos]         = useState<[number, number] | null>(
    savedLat != null && savedLng != null ? [savedLat, savedLng] : null
  )

  const prevIcao = useRef<string>('')
  const geoJsonKey = useRef(0)

  useEffect(() => { setMounted(true) }, [])

  // ── Fetch airport geometry whenever ICAO changes ──────────────────────────
  useEffect(() => {
    const normalized = icao.trim().toUpperCase()
    if (!normalized || normalized === prevIcao.current) return
    prevIcao.current = normalized

    setLoadState('loading')
    setFeatures([])
    setBounds(null)

    // ── Code variants ──────────────────────────────────────────────────────
    // Small US airports often have inconsistent identifiers between datasets.
    // Example: Costin Airport in Port St. Joe, FL has FAA LID "A51" but our
    // airports table stores gps_code "KA51", and OSM most commonly tags
    // these under the K-prefixed form (icao=KA51). Searching only the user's
    // typed code misses the OSM record.
    //
    // We expand to all plausible variants so the Overpass union catches the
    // record regardless of which convention the OSM contributor used.
    const variants = new Set<string>([normalized])
    if (/^[A-Z0-9]{3}$/.test(normalized)) {
      variants.add('K' + normalized)         // A51 → KA51
    }
    if (normalized.length === 4 && normalized.startsWith('K')) {
      variants.add(normalized.slice(1))      // KA51 → A51
    }

    // Union query: for each variant, match by icao, ref, faa, or local_ref.
    const matchClauses = [...variants].flatMap(code => [
      `area["aeroway"="aerodrome"]["icao"="${code}"];`,
      `area["aeroway"="aerodrome"]["ref"="${code}"];`,
      `area["aeroway"="aerodrome"]["faa"="${code}"];`,
      `area["aeroway"="aerodrome"]["local_ref"="${code}"];`,
    ]).join('')

    const query = [
      `[out:json][timeout:25];`,
      `(`,
      matchClauses,
      `)->.a;`,
      `(way["aeroway"~"runway|taxiway|taxilane|apron|terminal|hangar|parking_position"](area.a););`,
      `out body;>;out skel qt;`,
    ].join('')

    // Try primary Overpass server, fall back to mirror on failure
    const SERVERS = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
    ]

    const tryFetch = async (): Promise<{ elements: OverpassElement[] }> => {
      let lastErr: unknown
      for (const server of SERVERS) {
        try {
          const url = `${server}?data=${encodeURIComponent(query)}`
          const res = await fetch(url)
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return await res.json()
        } catch (e) {
          lastErr = e
        }
      }
      throw lastErr
    }

    tryFetch()
      .then((data) => {
        if (!data.elements || data.elements.length === 0) {
          setLoadState('notfound')
          return
        }
        const feats = overpassToGeoJSON(data.elements)
        if (feats.length === 0) {
          setLoadState('notfound')
          return
        }

        // Compute bounds from all nodes
        const nodes = data.elements.filter((e): e is OverpassNode => e.type === 'node')
        if (nodes.length > 0) {
          const latlngs: [number, number][] = nodes.map(n => [n.lat, n.lon])
          const b = L.latLngBounds(latlngs)
          setBounds(b)
        }

        geoJsonKey.current += 1
        setFeatures(feats)
        setLoadState('loaded')
      })
      .catch(() => setLoadState('error'))
  }, [icao])

  // ── Sync savedLat/savedLng prop changes ───────────────────────────────────
  useEffect(() => {
    if (savedLat != null && savedLng != null) {
      setMarkerPos([savedLat, savedLng])
    }
  }, [savedLat, savedLng])

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setMarkerPos([lat, lng])
    onLocationSelect?.(lat, lng)
  }, [onLocationSelect])

  // ── Pre-mount placeholder ─────────────────────────────────────────────────
  if (!mounted) {
    return <div style={{ width: '100%', height, backgroundColor: '#f3f4f6', borderRadius: '8px' }} />
  }

  // When notfound, show tile map if we have a fallback center (e.g. from auto-geocode)
  // Fall back to satellite tiles when: no OSM aerodrome found, OR Overpass API error —
  // as long as we have fallback coords (e.g. from airport DB selection).
  const hasTileFallback = (loadState === 'notfound' || loadState === 'error') && centerLat != null && centerLng != null

  // ── Overlay messages ──────────────────────────────────────────────────────
  const overlayContent = (() => {
    if (loadState === 'loading') return (
      <div style={overlayStyle}>
        <div style={spinnerStyle} />
        <p style={{ margin: '0.75rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
          Loading airport diagram for {icao.toUpperCase()}…
        </p>
      </div>
    )
    // If we have a fallback center, skip the blocking overlay — tiles will show instead
    if (loadState === 'notfound' && !hasTileFallback) return (
      <div style={overlayStyle}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✈️</div>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', maxWidth: '260px' }}>
          No airport diagram found for <strong>{icao.toUpperCase()}</strong> in OpenStreetMap.
          You can still pin your location — just drop the marker on the map below.
        </p>
      </div>
    )
    if (loadState === 'error' && !hasTileFallback) return (
      <div style={overlayStyle}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem', textAlign: 'center' }}>
          Could not load airport data. Check your connection and try again.
        </p>
      </div>
    )
    if (loadState === 'idle') return (
      <div style={overlayStyle}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛫</div>
        <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.875rem' }}>
          Enter an ICAO code to load the airport diagram.
        </p>
      </div>
    )
    return null
  })()

  // Default center (mid-USA) when no bounds yet
  const defaultCenter: [number, number] = [39.5, -98.35]

  return (
    <div
      className={hideZoomMobile ? 'hide-zoom-mobile' : undefined}
      style={{ position: 'relative', width: '100%', height, borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}
    >
      {/* Leaflet map — always rendered so it can receive state updates */}
      <MapContainer
        key="airport-map"
        center={defaultCenter}
        zoom={14}
        style={{ width: '100%', height: '100%', background: '#f8fafc' }}
        scrollWheelZoom
        zoomControl
      >
        {/* Force Leaflet to recompute container size after layout settles */}
        <InvalidateSizeOnMount />

        {/* Fit to airport bounds when OSM geometry loaded */}
        <FitBounds bounds={bounds} />

        {/* Center on fallback coords when tile mode is active */}
        {hasTileFallback && (
          <CenterMap lat={centerLat as number} lng={centerLng as number} zoom={15} />
        )}

        {/* OSM tile layer — shown only when no aerodrome diagram is available */}
        {hasTileFallback && (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />
        )}

        {/* Click-to-place handler */}
        {editable && <ClickHandler onLocationSelect={handleMapClick} />}

        {/* Airport geometry layers */}
        {features.map((feature, i) => {
          const aeroway = (feature.properties?.aeroway as string) ?? 'unknown'
          return (
            <GeoJSON
              key={`${geoJsonKey.current}-${i}`}
              data={feature}
              style={() => aeroStyle(aeroway)}
            />
          )
        })}

        {/* Hangar location marker */}
        {markerPos && (
          <Marker
            position={markerPos}
            icon={HANGAR_ICON}
            draggable={editable}
            eventHandlers={editable ? {
              dragend(e) {
                const latlng = e.target.getLatLng()
                setMarkerPos([latlng.lat, latlng.lng])
                onLocationSelect?.(latlng.lat, latlng.lng)
              },
            } : {}}
          />
        )}
      </MapContainer>

      {/* Overlay states (loading / not found / error / idle) */}
      {overlayContent && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1000,
          backgroundColor: 'rgba(248,250,252,0.92)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          borderRadius: '8px',
        }}>
          {overlayContent}
        </div>
      )}

      {/* Instruction badge in editable mode */}
      {editable && (loadState === 'loaded' || hasTileFallback) && (
        <div style={{
          position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 999, backgroundColor: 'rgba(17,24,39,0.8)', color: 'white',
          padding: '0.4rem 0.85rem', borderRadius: '20px',
          fontSize: '0.75rem', fontWeight: '500', pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          {markerPos ? 'Drag the pin or click to move it' : 'Click to place your hangar'}
        </div>
      )}

      {/* "No diagram" notice in tile fallback mode — subtle, non-blocking */}
      {hasTileFallback && (
        <div style={{
          position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 999, backgroundColor: 'rgba(255,255,255,0.9)',
          border: '1px solid #e5e7eb', borderRadius: '20px',
          padding: '0.3rem 0.85rem', fontSize: '0.72rem', color: '#6b7280',
          fontWeight: '500', pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          {loadState === 'error' ? `Diagram unavailable for ${icao.toUpperCase()} — satellite map shown` : `No diagram available for ${icao.toUpperCase()} — satellite map shown`}
        </div>
      )}

      {/* Attribution (Overpass / OSM) */}
      {(loadState === 'loaded' || hasTileFallback) && (
        <div style={{
          position: 'absolute', bottom: 0, right: 0, zIndex: 999,
          backgroundColor: 'rgba(255,255,255,0.7)',
          fontSize: '0.6rem', color: '#6b7280', padding: '2px 6px',
        }}>
          © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{ color: '#6b7280' }}>OpenStreetMap</a> contributors
        </div>
      )}

      <style>{`@keyframes airport-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Style constants ───────────────────────────────────────────────────────────
const overlayStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
}

const spinnerStyle: React.CSSProperties = {
  width: '32px', height: '32px',
  border: '3px solid #e5e7eb', borderTopColor: '#2563eb',
  borderRadius: '50%', animation: 'airport-spin 0.8s linear infinite',
}
