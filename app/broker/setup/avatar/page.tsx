import Link from 'next/link'
import SetupShell from '../SetupShell'
import { loadSetupContext } from '../loadSetupContext'
import AvatarUpload from '@/app/broker/dashboard/AvatarUpload'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Photo — Broker Setup | Hangar Marketplace',
}

export default async function AvatarStepPage() {
  const { profile, completedIds, brokerProfileId } = await loadSetupContext()

  return (
    <SetupShell currentId="avatar" completedIds={completedIds}>
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={EYEBROW}>Step 3 — Optional</p>
        <h1 style={H1}>Add a photo</h1>
        <p style={P}>
          Brokers with a real headshot get notably more inbound contacts. Pilots want to know who they\'re dealing with — a logo or initials sets a different tone than a face.
        </p>
      </div>

      {/* Centered upload UI. The AvatarUpload component handles the file
          dialog, validation, and server-side persistence. We supply the
          broker_profile_id so it writes to the right row. */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.5rem 0 0.25rem' }}>
        <AvatarUpload
          userId={brokerProfileId /* not used by the upload route, kept for component signature */}
          profileId={profile.id}
          currentAvatarUrl={profile.avatar_url}
          displayName={profile.full_name}
        />
        <p style={{ margin: '0.85rem 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
          JPG / PNG / WEBP, under 5 MB. Headshot framing works best.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link href="/broker/setup/profile" style={backLink}>← Back</Link>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <Link href="/broker/setup/specialty" style={skipLink}>
            Skip for now
          </Link>
          <Link href="/broker/setup/specialty" style={primaryBtn}>
            Continue →
          </Link>
        </div>
      </div>
    </SetupShell>
  )
}

const EYEBROW: React.CSSProperties = {
  margin: '0 0 0.5rem', fontSize: '0.7rem', fontWeight: 700,
  color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.08em',
}
const H1: React.CSSProperties = { margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }
const P:  React.CSSProperties = { margin: 0, fontSize: '0.92rem', color: '#475569', lineHeight: 1.6 }
const primaryBtn: React.CSSProperties = {
  display: 'inline-block', padding: '0.7rem 1.4rem',
  background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
  color: 'white', fontWeight: 700, fontSize: '0.9rem',
  borderRadius: '8px', textDecoration: 'none',
  boxShadow: '0 4px 12px rgba(29,78,216,0.25)',
}
const skipLink: React.CSSProperties = {
  padding: '0.7rem 1rem',
  color: '#64748b', textDecoration: 'none',
  fontSize: '0.875rem', fontWeight: 600,
}
const backLink: React.CSSProperties = { fontSize: '0.875rem', color: '#64748b', textDecoration: 'none' }
