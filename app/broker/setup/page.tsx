import Link from 'next/link'
import { Building2, Camera, MapPin, Sliders, FileText, Plane } from 'lucide-react'
import SetupShell from './SetupShell'
import { loadSetupContext } from './loadSetupContext'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Welcome | Broker Setup',
}

export default async function WelcomePage() {
  const { profile, completedIds } = await loadSetupContext()

  // Already completed — short-circuit to a "go to dashboard" view.
  if (profile.setup_completed_at) {
    return (
      <SetupShell currentId="welcome" completedIds={completedIds}>
        <h1 style={H1}>You&apos;re already set up</h1>
        <p style={P}>
          Looks like you&apos;ve completed setup. You can revisit any step from the progress bar above, or jump straight back to your dashboard.
        </p>
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
          <Link href="/broker/dashboard" style={primaryBtn}>Go to dashboard</Link>
          <Link href="/broker/setup/profile" style={secondaryBtn}>Review setup</Link>
        </div>
      </SetupShell>
    )
  }

  const firstName = profile.full_name.split(' ')[0]

  return (
    <SetupShell currentId="welcome" completedIds={completedIds}>
      {/* Hero icon — modern square with Lucide plane */}
      <div style={{
        width: '64px', height: '64px', borderRadius: '14px',
        background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '1.25rem',
        boxShadow: '0 8px 24px rgba(29,78,216,0.25)',
      }}>
        <Plane size={28} color="white" strokeWidth={2} />
      </div>

      <h1 style={H1}>Welcome aboard, {firstName}.</h1>
      <p style={P}>
        Your verified broker badge is live. Before you list your first property, let&apos;s spend about
        {' '}<strong>3 minutes</strong> setting up your profile. The more complete your profile,
        the more inbound buyer interest you&apos;ll generate.
      </p>

      {/* What we'll cover — modern Lucide icons, no emojis */}
      <div style={{ marginTop: '1.5rem', display: 'grid', gap: '0.6rem' }}>
        <ChecklistRow icon={<Building2 size={16} strokeWidth={1.75} />} label="Confirm your brokerage and contact info" />
        <ChecklistRow icon={<Camera     size={16} strokeWidth={1.75} />} label="Upload a photo (optional, but recommended)" />
        <ChecklistRow icon={<MapPin     size={16} strokeWidth={1.75} />} label="Mark your specialty airports (optional)" />
        <ChecklistRow icon={<Sliders    size={16} strokeWidth={1.75} />} label="Set notification preferences and opt into the weekly market intelligence email" />
        <ChecklistRow icon={<FileText   size={16} strokeWidth={1.75} />} label="Land on the listing form, ready to post" />
      </div>

      {/* Primary CTA */}
      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <Link href="/broker/dashboard" style={skipLink}>
          Skip setup, go to dashboard
        </Link>
        <Link href="/broker/setup/profile" style={primaryBtn}>
          Get started →
        </Link>
      </div>
    </SetupShell>
  )
}

function ChecklistRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.7rem',
      padding: '0.7rem 0.9rem',
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '0.875rem',
      color: '#334155',
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '28px', height: '28px', borderRadius: '7px',
        backgroundColor: 'white', color: '#1d4ed8',
        border: '1px solid #dbeafe',
      }}>
        {icon}
      </span>
      <span>{label}</span>
    </div>
  )
}

const H1: React.CSSProperties = {
  margin: '0 0 0.6rem',
  fontSize: '1.7rem',
  fontWeight: 800,
  color: '#0f172a',
  letterSpacing: '-0.02em',
}
const P: React.CSSProperties = {
  margin: 0,
  fontSize: '0.95rem',
  color: '#475569',
  lineHeight: 1.65,
}
const primaryBtn: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.7rem 1.5rem',
  background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
  color: 'white',
  fontWeight: 700,
  fontSize: '0.92rem',
  borderRadius: '8px',
  textDecoration: 'none',
  boxShadow: '0 4px 12px rgba(29,78,216,0.25)',
}
const secondaryBtn: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.7rem 1.5rem',
  backgroundColor: 'white',
  color: '#0f172a',
  fontWeight: 600,
  fontSize: '0.92rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  textDecoration: 'none',
}
const skipLink: React.CSSProperties = {
  color: '#64748b',
  fontSize: '0.875rem',
  textDecoration: 'underline',
}
