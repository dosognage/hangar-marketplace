/**
 * Geocoding + distance utilities used by server-side radius search.
 *
 * Geocoding: Nominatim (OpenStreetMap) — free, no API key needed.
 * Airport ICAO codes are passed as-is; Nominatim handles them well
 * when appended with "airport".
 */

export type GeoPoint = { lat: number; lng: number }

/**
 * Geocode a free-text location string (city, state, ICAO code) to lat/lng.
 * Returns null if lookup fails or returns no results.
 */
export async function geocodeLocation(q: string): Promise<GeoPoint | null> {
  const trimmed = q.trim()
  if (!trimmed) return null

  // Looks like an airport identifier — could be ICAO (KPAE) or FAA (S36, 3W0)
  // Add "airport USA" to help Nominatim find it regardless of format.
  const looksLikeAirport = /^[A-Z0-9]{2,6}$/.test(trimmed.toUpperCase())
  const searchQ = looksLikeAirport
    ? `${trimmed.toUpperCase()} airport USA`
    : `${trimmed}, USA`

  try {
    const url =
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(searchQ)}&format=json&limit=1&countrycodes=us`

    const res = await fetch(url, {
      headers: { 'User-Agent': 'HangarMarketplace/1.0' },
      // Don't cache on the server — each search should be fresh
      cache: 'no-store',
    })

    if (!res.ok) return null

    const data = await res.json()
    if (!data[0]) return null

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    }
  } catch {
    return null
  }
}

/**
 * Haversine great-circle distance between two points, in miles.
 */
export function distanceMiles(a: GeoPoint, b: GeoPoint): number {
  const R = 3958.8 // Earth radius in miles
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng * sinLng
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export const RADIUS_OPTIONS = [
  { value: '10',  label: 'Within 10 mi' },
  { value: '25',  label: 'Within 25 mi' },
  { value: '50',  label: 'Within 50 mi' },
  { value: '100', label: 'Within 100 mi' },
  { value: '250', label: 'Within 250 mi' },
] as const
