import Link from 'next/link'
import { redirect } from 'next/navigation'
import SetupShell from '../SetupShell'
import { loadSetupContext } from '../loadSetupContext'
import { completeSetup } from '../actions'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'All set — Broker Setup | Hangar Marketplace',
}

export default async function DonePage() {
  const ctx = await loadSetupContext()

  // First-time hit: stamp setup_completed_at and re-fetch (so the progress
  // indicator shows 100%). After that, this page is effectively a "you're
  // all set, here's what to do next" landing.
  if (!ctx.profile.setup_completed_at) {
    await completeSetup()
    redirect('/broker/setup/done')
  }

  return (
    <SetupShell currentId="done" completedIds={ctx.completedIds}>
      {/* Celebration hero */}
      <div style={{
        width: '72px', height: '72px', borderRadius: '50%',
        background: 'linear-gradient(135deg, #16a34a, #22c55e)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '1.25rem',
        boxShadow: '0 12px 32px rgba(34,197,94,0.3)',
      }}>
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <path d="M9 18 L15 24 L27 12" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <h1 style={H1}>You\'re all set up.</h1>
      <p style={P}>
        Your broker profile is live and complete. The next step is the one that actually moves the needle: post your first listing. Listings from verified brokers go live immediately — no review queue.
      </p>

      {/* Recap of what's done */}
      <div style={{
        marginTop: '1.5rem', padding: '1rem 1.2rem',
        backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
        borderRadius: '10px',
      }}>
        <p style={{ margin: '0 0 0.6rem', fontSize: '0.78rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          What you set up
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.875rem', color: '#15803d', lineHeight: 1.7 }}>
          <li>Profile + contact info ready for buyers</li>
          {ctx.profile.avatar_url && <li>Headshot uploaded</li>}
          {(ctx.profile.specialty_airports?.length ?? 0) > 0 && (
            <li>{ctx.profile.specialty_airports!.length} specialty airport{ctx.profile.specialty_airports!.length === 1 ? '' : 's'} marked</li>
          )}
          <li>Alert radius: {ctx.profile.alert_radius_miles} miles</li>
        </ul>
      </div>

      {/* Primary CTAs — listing first, then dashboard */}
      <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <Link href="/submit?from=broker-setup" style={primaryBtn}>
          📋 Post my first listing →
        </Link>
        <Link href="/broker/dashboard" style={secondaryBtn}>
          Skip to dashboard
        </Link>
      </div>

      {/* Bonus: reminder about the newsletter if they opted in */}
      <p style={{ marginTop: '1.5rem', fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center' }}>
        Look for the first market intelligence newsletter Monday morning. Watch for it from <strong>hello@hangarmarketplace.com</strong>.
      </p>
    </SetupShell>
  )
}

const H1: React.CSSProperties = { margin: '0 0 0.6rem', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }
const P:  React.CSSProperties = { margin: 0, fontSize: '0.95rem', color: '#475569', lineHeight: 1.65 }
const primaryBtn: React.CSSProperties = {
  display: 'inline-block',
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
