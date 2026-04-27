'use client'

/**
 * "Fits my [aircraft]" pill on the homepage hero. Mirrors the HangarNight
 * pattern: a single toggle that filters the listings panel below to only
 * hangars whose door + depth dimensions can accommodate the user's saved
 * aircraft (with sane clearance buffers).
 *
 * State lives in the parent so the same toggle drives the SplitView filter.
 */

import type { AircraftSpec } from '@/app/actions/aircraft'

type Variant = 'hero' | 'panel'

export default function AircraftFitFilterPill({
  aircraft,
  active,
  onToggle,
  variant = 'hero',
}: {
  aircraft: AircraftSpec | { common_name: string } | null
  active:   boolean
  onToggle: (next: boolean) => void
  variant?: Variant
}) {
  const styles = variant === 'panel' ? PANEL_STYLES : HERO_STYLES

  // No saved aircraft → nudge user into Settings rather than hiding the pill.
  if (!aircraft) {
    return (
      <a href="/settings" style={styles.link}>
        <PlaneIcon variant={variant} />
        <span>Set your aircraft to filter by fit</span>
      </a>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onToggle(!active)}
      aria-pressed={active}
      style={active ? styles.active : styles.inactive}
    >
      <PlaneIcon variant={variant} active={active} />
      <span>{active ? 'Showing only hangars that fit your ' : 'Fits my '}{aircraft.common_name}</span>
      {active && (
        <span style={{ marginLeft: '0.4rem', opacity: 0.85, fontSize: '0.78rem' }}>×</span>
      )}
    </button>
  )
}

// Used by SplitView to render the same pill against the listings panel's
// light background.
export function AircraftFitFilterPillInline(props: {
  aircraft: AircraftSpec | { common_name: string } | null
  active:   boolean
  onToggle: (next: boolean) => void
}) {
  return <AircraftFitFilterPill {...props} variant="panel" />
}

function PlaneIcon({ variant, active = false }: { variant: Variant; active?: boolean }) {
  // Color picks: dark stroke on light bg (panel + active), white on dark (hero inactive).
  const stroke = variant === 'panel'
    ? '#0f172a'
    : active ? '#0f172a' : 'currentColor'
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke={stroke} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2c-.5.1-.9.5-.9 1 0 .3.1.6.3.8l2.5 2.5L2 13.5c-.1.3 0 .7.3.9l1.3 1.3c.2.2.6.3.9.2l3.5-1.7 2.5 2.5c.2.2.5.3.8.3.5 0 .9-.4 1-.9z"/>
    </svg>
  )
}

const basePillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.45rem',
  padding: '0.5rem 1rem',
  borderRadius: '999px',
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background-color 0.15s ease, color 0.15s ease',
  whiteSpace: 'nowrap',
  textDecoration: 'none',
}

// Hero variant — for dark backgrounds (e.g., HangarNight-style hero band).
const HERO_STYLES = {
  inactive: {
    ...basePillStyle,
    backgroundColor: 'rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.92)',
    border: '1px solid rgba(255,255,255,0.25)',
  } as React.CSSProperties,
  active: {
    ...basePillStyle,
    backgroundColor: 'white',
    color: '#0f172a',
    border: '1px solid white',
  } as React.CSSProperties,
  link: {
    ...basePillStyle,
    backgroundColor: 'rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.85)',
    border: '1px dashed rgba(255,255,255,0.35)',
    fontWeight: 500,
  } as React.CSSProperties,
}

// Panel variant — for the white/gray listings panel.
const PANEL_STYLES = {
  inactive: {
    ...basePillStyle,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    border: '1px solid #e2e8f0',
  } as React.CSSProperties,
  active: {
    ...basePillStyle,
    backgroundColor: '#0f172a',
    color: 'white',
    border: '1px solid #0f172a',
  } as React.CSSProperties,
  link: {
    ...basePillStyle,
    backgroundColor: '#f8fafc',
    color: '#475569',
    border: '1px dashed #cbd5e1',
    fontWeight: 500,
  } as React.CSSProperties,
}
