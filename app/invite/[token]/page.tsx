import { createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import AcceptInviteButton from './AcceptInviteButton'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Accept Invitation — Hangar Marketplace' }

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase  = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const db = serviceClient()

  // Look up the invitation
  const { data: member } = await db
    .from('organization_members')
    .select('id, invited_email, status, org_id')
    .eq('invite_token', token)
    .single()

  // Lookup the org name
  const { data: org } = member
    ? await db.from('organizations').select('name, subscription_tier').eq('id', member.org_id).single()
    : { data: null }

  // ── Invalid token ────────────────────────────────────────────────────────
  if (!member || !org) {
    return (
      <Card icon="✕" iconColor="#f87171" title="Invitation not found">
        <p style={bodyStyle}>
          This invitation link is invalid or has already been used.
          If you believe this is an error, ask your team owner to send a new invite.
        </p>
        <Link href="/" style={linkBtnStyle}>Go to Hangar Marketplace</Link>
      </Card>
    )
  }

  // ── Already accepted ─────────────────────────────────────────────────────
  if (member.status === 'active') {
    return (
      <Card icon="✓" iconColor="#34d399" title="Already a member">
        <p style={bodyStyle}>You're already part of <strong>{org.name}</strong>.</p>
        <Link href="/team" style={linkBtnStyle}>Go to team →</Link>
      </Card>
    )
  }

  // ── Revoked ──────────────────────────────────────────────────────────────
  if (member.status === 'removed') {
    return (
      <Card icon="✕" iconColor="#f87171" title="Invitation revoked">
        <p style={bodyStyle}>This invitation has been revoked by the account owner.</p>
        <Link href="/" style={linkBtnStyle}>Go to Hangar Marketplace</Link>
      </Card>
    )
  }

  // ── Not logged in — prompt to sign in ────────────────────────────────────
  if (!user) {
    const loginUrl  = `/login?returnTo=/invite/${token}`
    const signupUrl = `/signup?returnTo=/invite/${token}`
    return (
      <Card icon="✈" iconColor="#2563eb" title={`You're invited to join ${org.name}`}>
        <p style={bodyStyle}>
          You've been invited to join <strong>{org.name}</strong> on Hangar Marketplace.
          Sign in or create an account to accept.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
          <Link href={signupUrl} style={{ ...linkBtnStyle, backgroundColor: '#2563eb', color: 'white' }}>
            Create account
          </Link>
          <Link href={loginUrl} style={{ ...linkBtnStyle, backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db' }}>
            Sign in
          </Link>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '1rem' }}>
          Invitation sent to <strong>{member.invited_email}</strong>
        </p>
      </Card>
    )
  }

  // ── Logged in — ready to accept ───────────────────────────────────────────
  return (
    <Card icon="✈" iconColor="#2563eb" title={`Join ${org.name}`}>
      <p style={bodyStyle}>
        You've been invited to join <strong>{org.name}</strong> on Hangar Marketplace.
        As a team member you'll share the organization's hangar request pool.
      </p>
      <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 1.25rem' }}>
        Accepting as <strong>{user.email}</strong>
      </p>
      <AcceptInviteButton token={token} />
    </Card>
  )
}

// ── Shared layout card ────────────────────────────────────────────────────

function Card({
  icon, iconColor, title, children,
}: {
  icon: string; iconColor: string; title: string; children: React.ReactNode
}) {
  return (
    <div style={{
      maxWidth: '460px',
      margin: '4rem auto',
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      overflow: 'hidden',
    }}>
      <div style={{ backgroundColor: '#1a3a5c', padding: '1.5rem 2rem' }}>
        <p style={{ margin: 0, color: 'white', fontWeight: '700', fontSize: '1rem' }}>✈ Hangar Marketplace</p>
      </div>
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.25rem', color: iconColor, marginBottom: '0.75rem' }}>{icon}</div>
        <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>{title}</h1>
        {children}
      </div>
    </div>
  )
}

const bodyStyle: React.CSSProperties = {
  margin: '0 0 0.5rem',
  fontSize: '0.9rem',
  color: '#374151',
  lineHeight: 1.6,
}

const linkBtnStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.6rem 1.25rem',
  borderRadius: '7px',
  fontSize: '0.875rem',
  fontWeight: '600',
  textDecoration: 'none',
  backgroundColor: '#f3f4f6',
  color: '#374151',
}
