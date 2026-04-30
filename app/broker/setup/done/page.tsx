import Link from 'next/link'
import { Plane, Camera, MapPin, Bell, FileText, CheckCircle2 } from 'lucide-react'
import SetupShell from '../SetupShell'
import { loadSetupContext } from '../loadSetupContext'
import type { SetupStepId } from '../steps'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'All set | Hangar Marketplace',
}

export default async function DonePage() {
  const ctx = await loadSetupContext()

  // setup_completed_at is stamped by the preferences server action (the last
  // step before this one). We deliberately do NOT write to the DB during
  // render here — Next.js disallows revalidatePath inside renders, and
  // race-y double-redirects produced "could not load page" errors. If a user
  // somehow arrives here without having submitted preferences, we still
  // render the done UI but the progress bar will (correctly) show < 100%.
  const completedIds: Set<SetupStepId> = ctx.profile.setup_completed_at
    ? new Set<SetupStepId>([...ctx.completedIds, 'done'])
    : ctx.completedIds

  return (
    <SetupShell currentId="done" completedIds={completedIds}>
      {/* Celebration hero */}
      <div style={{
        width: '72px', height: '72px', borderRadius: '50%',
        background: 'linear-gradient(135deg, #16a34a, #22c55e)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '1.25rem',
        boxShadow: '0 12px 32px rgba(34,197,94,0.3)',
      }}>
        <CheckCircle2 size={36} color="white" strokeWidth={2.5} />
      </div>

      <h1 style={H1}>You&apos;re all set up.</h1>
      <p style={P}>
        Your broker profile is live and complete. The next step is the one that actually moves the needle: post your first listing. Listings from verified brokers go live immediately, with no review queue.
      </p>

      {/* Recap of what's done */}
      <div style={{
        marginTop: '1.5rem', padding: '1rem 1.2rem',
        backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
        borderRadius: '10px',
      }}>
        <p style={{ margin: '0 0 0.65rem', fontSize: '0.78rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          What you set up
        </p>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.4rem' }}>
          <RecapItem icon={<Plane size={14} />} text="Profile and contact info ready for buyers" />
          {ctx.profile.avatar_url && <RecapItem icon={<Camera size={14} />} text="Headshot uploaded" />}
          {(ctx.profile.specialty_airports?.length ?? 0) > 0 && (
            <RecapItem
              icon={<MapPin size={14} />}
              text={`${ctx.profile.specialty_airports!.length} specialty airport${ctx.profile.specialty_airports!.length === 1 ? '' : 's'} marked`}
            />
          )}
          <RecapItem icon={<Bell size={14} />} text={`Alert radius: ${ctx.profile.alert_radius_miles} miles`} />
        </ul>
      </div>

      {/* Primary CTAs */}
      <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <Link href="/submit?from=broker-setup" style={primaryBtn}>
          <FileText size={16} strokeWidth={2.25} />
          <span>Post my first listing</span>
          <span style={{ marginLeft: '0.2rem' }}>→</span>
        </Link>
        <Link href="/broker/dashboard" style={secondaryBtn}>
          Skip to dashboard
        </Link>
      </div>

      <p style={{ marginTop: '1.5rem', fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center' }}>
        Look for the first market intelligence newsletter Monday morning. Watch for it from <strong>hello@hangarmarketplace.com</strong>.
      </p>
    </SetupShell>
  )
}

function RecapItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.875rem', color: '#15803d' }}>
      <span style={{ display: 'inline-flex', color: '#16a34a' }}>{icon}</span>
      <span>{text}</span>
    </li>
  )
}

const H1: React.CSSProperties = { margin: '0 0 0.6rem', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }
const P:  React.CSSProperties = { margin: 0, fontSize: '0.95rem', color: '#475569', lineHeight: 1.65 }
const primaryBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center', gap: '0.55rem',
  padding: '0.85rem 1.5rem',
  background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
  color: 'white', fontWeight: 700, fontSize: '0.95rem',
  borderRadius: '10px', textDecoration: 'none', textAlign: 'center',
  boxShadow: '0 6px 16px rgba(29,78,216,0.28)',
}
const secondaryBtn: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.7rem 1.5rem',
  backgroundColor: 'white', color: '#475569',
  border: '1px solid #cbd5e1', borderRadius: '10px',
  textDecoration: 'none', textAlign: 'center',
  fontWeight: 600, fontSize: '0.9rem',
}
