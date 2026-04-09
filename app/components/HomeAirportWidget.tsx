'use client'

/**
 * HomeAirportWidget
 *
 * Displays the user's home airport ICAO code in the nav header with a
 * colored dot showing the current flight category:
 *
 *   ● green  — VFR   (ceiling ≥ 3000 ft, vis ≥ 5 SM)
 *   ● blue   — MVFR  (ceiling 1000–3000 ft or vis 3–5 SM)
 *   ● red    — IFR   (ceiling 500–999 ft or vis 1–3 SM)
 *   ● pink   — LIFR  (ceiling < 500 ft or vis < 1 SM)
 *   ● grey   — unknown / loading
 *
 * Fetches from /api/weather/[icao] every REFRESH_MS milliseconds.
 * Clicking navigates to /settings to change the home airport.
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type FlightCat = 'VFR' | 'MVFR' | 'IFR' | 'LIFR' | 'UNKNOWN'

type WeatherData = {
  icao:    string
  fltcat:  FlightCat
  temp:    number | null
  wind:    string | null
  visib:   string | null
  cover:   string | null
  ceiling: number | null
  obsTime: string | null
}

const REFRESH_MS = 10 * 60 * 1000 // 10 minutes

const CAT_COLOR: Record<FlightCat, string> = {
  VFR:     '#16a34a',  // green
  MVFR:    '#2563eb',  // blue
  IFR:     '#dc2626',  // red
  LIFR:    '#db2777',  // pink
  UNKNOWN: '#6b7280',  // grey
}

const CAT_LABEL: Record<FlightCat, string> = {
  VFR:     'VFR — Visual Flight Rules',
  MVFR:    'MVFR — Marginal VFR',
  IFR:     'IFR — Instrument Flight Rules',
  LIFR:    'LIFR — Low IFR',
  UNKNOWN: 'Weather data unavailable',
}

type Props = { icao: string }

export default function HomeAirportWidget({ icao }: Props) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTooltip, setShowTooltip] = useState(false)

  const fetchWeather = useCallback(async () => {
    try {
      const res = await fetch(`/api/weather/${encodeURIComponent(icao)}`)
      if (!res.ok) {
        setWeather(null)
      } else {
        const data = await res.json()
        setWeather(data)
      }
    } catch {
      setWeather(null)
    } finally {
      setLoading(false)
    }
  }, [icao])

  // Initial fetch + polling
  useEffect(() => {
    fetchWeather()
    const timer = setInterval(fetchWeather, REFRESH_MS)
    return () => clearInterval(timer)
  }, [fetchWeather])

  const fltcat: FlightCat = weather?.fltcat ?? 'UNKNOWN'
  const dotColor = CAT_COLOR[fltcat]
  const tooltipLabel = CAT_LABEL[fltcat]

  // Format obs time for tooltip
  const obsLabel = weather?.obsTime
    ? `Updated ${new Date(weather.obsTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}`
    : ''

  // Build detail lines for tooltip
  const details: string[] = []
  if (weather?.visib)   details.push(`Vis: ${weather.visib} SM`)
  if (weather?.ceiling) details.push(`Ceiling: ${weather.ceiling} ft`)
  if (weather?.wind)    details.push(`Wind: ${weather.wind}`)
  if (weather?.temp != null) details.push(`Temp: ${weather.temp}°C`)

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Link
        href="/settings"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.3rem 0.7rem',
          borderRadius: '999px',
          backgroundColor: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          textDecoration: 'none',
          color: 'white',
          fontSize: '0.82rem',
          fontWeight: '600',
          fontFamily: 'Arial, sans-serif',
          letterSpacing: '0.03em',
          transition: 'background-color 0.15s',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')}
        title={`${icao} — ${tooltipLabel}`}
      >
        {/* Colored dot */}
        <span
          style={{
            display: 'inline-block',
            width: '9px',
            height: '9px',
            borderRadius: '50%',
            backgroundColor: loading ? '#6b7280' : dotColor,
            flexShrink: 0,
            boxShadow: loading ? 'none' : `0 0 6px ${dotColor}99`,
            // Pulse animation while loading
            animation: loading ? 'pulse 1.2s ease-in-out infinite' : 'none',
          }}
        />
        {icao.toUpperCase()}
      </Link>

      {/* Tooltip */}
      {showTooltip && !loading && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            backgroundColor: '#1e293b',
            color: 'white',
            borderRadius: '8px',
            padding: '0.6rem 0.85rem',
            fontSize: '0.78rem',
            lineHeight: 1.5,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.1)',
            zIndex: 5000,
            pointerEvents: 'none',
          }}
        >
          {/* Category badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: details.length ? '0.4rem' : 0 }}>
            <span style={{
              display: 'inline-block', width: '8px', height: '8px',
              borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0,
            }} />
            <span style={{ fontWeight: '700', color: dotColor }}>{fltcat}</span>
            <span style={{ color: '#94a3b8', fontWeight: '400' }}>
              — {
                fltcat === 'VFR'  ? 'Visual Flight Rules' :
                fltcat === 'MVFR' ? 'Marginal VFR' :
                fltcat === 'IFR'  ? 'Instrument Flight Rules' :
                fltcat === 'LIFR' ? 'Low IFR' :
                'No data'
              }
            </span>
          </div>

          {/* Detail lines */}
          {details.length > 0 && (
            <div style={{ color: '#cbd5e1', paddingLeft: '1.2rem' }}>
              {details.map((d, i) => <div key={i}>{d}</div>)}
            </div>
          )}

          {/* Obs time + change hint */}
          <div style={{ marginTop: '0.4rem', color: '#64748b', fontSize: '0.72rem' }}>
            {obsLabel}
            {obsLabel && ' · '}
            Click to change airport
          </div>

          {/* Tooltip arrow */}
          <div style={{
            position: 'absolute',
            top: '-5px',
            right: '18px',
            width: '10px',
            height: '10px',
            backgroundColor: '#1e293b',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRight: 'none',
            borderBottom: 'none',
            transform: 'rotate(45deg)',
          }} />
        </div>
      )}
    </div>
  )
}
