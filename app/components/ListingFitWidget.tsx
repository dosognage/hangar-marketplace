'use client'

/**
 * Listing-detail "Will my aircraft fit?" widget.
 *
 * Server-rendered with the user's saved aircraft + this listing's door/depth
 * dimensions, then renders a verdict client-side via the existing checkFit()
 * logic. Same data shape as the homepage filter, so they stay consistent.
 *
 * Three render branches:
 *   1. User logged in + has saved aircraft + listing has dim data
 *      → Show the verdict (yes / tight / no with reasons).
 *   2. Listing has no door/depth data
 *      → Render nothing (don't pretend to know what we don't).
 *   3. User has no saved aircraft
 *      → Show a small CTA pointing to Profile Settings.
 */

import Link from 'next/link'
import { checkFit, type AircraftDims, type HangarDims } from '@/lib/aircraftFit'

export default function ListingFitWidget({
  aircraft,
  hangar,
}: {
  aircraft: { common_name: string; wingspan_ft: number; length_ft: number; height_ft: number } | null
  hangar:   HangarDims
}) {
  // No dim data on the listing → don't render. Buyers shouldn't see a fake
  // verdict based on missing data.
  const hasAnyDim = hangar.door_width != null || hangar.door_height != null || hangar.hangar_depth != null
  if (!hasAnyDim) return null

  // No saved aircraft → soft CTA.
  if (!aircraft) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <PlaneIcon />
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>
            Will your aircraft fit?
          </span>
        </div>
        <p style={{ margin: '0.25rem 0 0.6rem', fontSize: '0.85rem', color: '#475569' }}>
          Set your aircraft in Profile Settings and we&apos;ll check this hangar against your dimensions.
        </p>
        <Link href="/settings" style={ctaStyle}>Set your aircraft →</Link>
      </div>
    )
  }

  const dims: AircraftDims = {
    wingspan_ft: aircraft.wingspan_ft,
    length_ft:   aircraft.length_ft,
    height_ft:   aircraft.height_ft,
  }
  const verdict = checkFit(dims, hangar)

  // Verdict variants — pick a colored chip + body text
  const meta = (() => {
    if (verdict.fits === 'unknown') return null
    if (verdict.fits === 'yes') {
      return {
        label:  'Fits with room to spare',
        chip:   { bg: '#dcfce7', text: '#166534', border: '#86efac' },
        body:   `Your ${aircraft.common_name} fits this hangar comfortably with our standard clearance buffers.`,
      }
    }
    if (verdict.fits === 'tight') {
      return {
        label:  'Tight fit',
        chip:   { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
        body:   `Your ${aircraft.common_name} fits but with minimal clearance: ${verdict.reasons.join('; ')}.`,
      }
    }
    return {
      label:  'Doesn\'t fit',
      chip:   { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
      body:   `Your ${aircraft.common_name} won\'t fit: ${verdict.reasons.join('; ')}.`,
    }
  })()

  if (!meta) return null

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <PlaneIcon />
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>
          Will your {aircraft.common_name} fit?
        </span>
      </div>
      <span style={{
        display: 'inline-block',
        marginTop: '0.5rem',
        padding: '0.25rem 0.7rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        backgroundColor: meta.chip.bg,
        color: meta.chip.text,
        border: `1px solid ${meta.chip.border}`,
      }}>
        {meta.label}
      </span>
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#374151', lineHeight: 1.55 }}>
        {meta.body}
      </p>
      <p style={{ margin: '0.45rem 0 0', fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.5 }}>
        Based on your aircraft&apos;s nominal published dimensions and a standard ramp clearance buffer. Modifications may differ.
      </p>
    </div>
  )
}

function PlaneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
         stroke="#0f172a" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2c-.5.1-.9.5-.9 1 0 .3.1.6.3.8l2.5 2.5L2 13.5c-.1.3 0 .7.3.9l1.3 1.3c.2.2.6.3.9.2l3.5-1.7 2.5 2.5c.2.2.5.3.8.3.5 0 .9-.4 1-.9z"/>
    </svg>
  )
}

const containerStyle: React.CSSProperties = {
  marginTop: '1rem',
  padding: '0.85rem 1rem',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  backgroundColor: '#f8fafc',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
}

const ctaStyle: React.CSSProperties = {
  display: 'inline-block',
  fontSize: '0.82rem',
  fontWeight: 600,
  color: '#2563eb',
  textDecoration: 'none',
}
