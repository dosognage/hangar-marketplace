/**
 * /settings — User profile settings
 *
 * Currently exposes:
 *   • Home airport — ICAO code stored in Supabase auth user_metadata
 *
 * Uses a server action + useActionState so the save round-trip is
 * fully server-rendered with no client fetch boilerplate.
 */

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import type { Metadata } from 'next'
import SettingsForm from './SettingsForm'

export const metadata: Metadata = {
  title: 'Settings | Hangar Marketplace',
}

export default async function SettingsPage() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login?next=/settings')
  }

  const homeAirport = (user.user_metadata?.home_airport as string | null) ?? ''

  return (
    <div style={{ maxWidth: '580px' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', color: '#111827' }}>
          Settings
        </h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
          Signed in as <strong>{user.email}</strong>
        </p>
      </div>

      {/* Home airport section */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        {/* Section header */}
        <div style={{
          padding: '1rem 1.4rem',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
        }}>
          {/* Plane icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2c-.5.1-.9.5-.9 1 0 .3.1.6.3.8l2.5 2.5L2 13.5c-.1.3 0 .7.3.9l1.3 1.3c.2.2.6.3.9.2l3.5-1.7 2.5 2.5c.2.2.5.3.8.3.5 0 .9-.4 1-.9z"/>
          </svg>
          <div>
            <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem', color: '#111827' }}>
              Home Airport
            </p>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.4 }}>
              Your home airport ICAO code. Shown in the nav with live flight conditions.
            </p>
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: '1.4rem' }}>
          <SettingsForm currentAirport={homeAirport} />
        </div>
      </div>

      {/* Legend */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem 1.25rem',
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
      }}>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.78rem', fontWeight: '700',
                    color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Flight Category Legend
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {[
            { color: '#16a34a', label: 'VFR',  desc: 'Ceiling ≥ 3,000 ft & vis ≥ 5 SM' },
            { color: '#2563eb', label: 'MVFR', desc: 'Ceiling 1,000–3,000 ft or vis 3–5 SM' },
            { color: '#dc2626', label: 'IFR',  desc: 'Ceiling 500–999 ft or vis 1–3 SM' },
            { color: '#db2777', label: 'LIFR', desc: 'Ceiling < 500 ft or vis < 1 SM' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span style={{
                display: 'inline-block', width: '10px', height: '10px',
                borderRadius: '50%', backgroundColor: item.color, flexShrink: 0, marginTop: '3px',
                boxShadow: `0 0 5px ${item.color}88`,
              }} />
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#111827' }}>
                  {item.label}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#6b7280', marginLeft: '0.3rem' }}>
                  : {item.desc}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.73rem', color: '#9ca3af', lineHeight: 1.5 }}>
          Weather data from AviationWeather.gov · Updates every 10 minutes
        </p>
      </div>
    </div>
  )
}
