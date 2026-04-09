'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Member = {
  id: string
  invited_email: string
  role: string
  status: string
  accepted_at: string | null
  invited_at: string
}

type Org = {
  id: string
  name: string
  owner_id: string
  subscription_tier: string
  seat_limit: number
}

type Props = {
  org: Org
  members: Member[]
  isOwner: boolean
  seatLimit: number
  activeCount: number
  tierLabel: string
  currentUserEmail: string
}

export default function TeamManager({
  org, members, isOwner, seatLimit, activeCount, tierLabel, currentUserEmail,
}: Props) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  const seatsUsed      = activeCount
  const seatsRemaining = seatLimit === 999 ? '∞' : Math.max(0, seatLimit - seatsUsed)
  const atLimit        = seatLimit !== 999 && seatsUsed >= seatLimit

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError('')
    setInviteSuccess('')

    startTransition(async () => {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteError(data.error ?? 'Something went wrong.')
      } else {
        setInviteSuccess(`Invitation sent to ${inviteEmail}`)
        setInviteEmail('')
        router.refresh()
      }
    })
  }

  async function handleRemove(memberId: string, email: string) {
    if (!confirm(`Remove ${email} from the team?`)) return
    setRemovingId(memberId)
    const res = await fetch('/api/team/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    })
    setRemovingId(null)
    if (res.ok) {
      router.refresh()
    }
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', paddingBottom: '3rem' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>
          Team management
        </h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
          {org.name}
        </p>
      </div>

      {/* ── Seat usage card ───────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
      }}>
        <div>
          <p style={{ margin: '0 0 0.2rem', fontSize: '0.775rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Seats used
          </p>
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>
            {seatsUsed}
            <span style={{ fontSize: '1rem', fontWeight: '400', color: '#9ca3af' }}>
              {' '}/ {seatLimit === 999 ? 'Unlimited' : seatLimit}
            </span>
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{
            display: 'inline-block',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: '700',
            backgroundColor: atLimit ? '#fef2f2' : '#f0fdf4',
            color: atLimit ? '#dc2626' : '#166534',
          }}>
            {atLimit
              ? 'Seat limit reached'
              : `${seatsRemaining} seat${seatsRemaining === '∞' || seatsRemaining !== 1 ? 's' : ''} remaining`}
          </span>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
            {tierLabel} plan ·{' '}
            <Link href="/pricing" style={{ color: '#2563eb', textDecoration: 'none' }}>
              Upgrade
            </Link>
          </p>
        </div>
      </div>

      {/* ── Invite form (owner only) ──────────────────────────────────────── */}
      {isOwner && (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
        }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: '700', color: '#111827' }}>
            Invite a team member
          </h2>

          {atLimit ? (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '7px',
              fontSize: '0.875rem',
              color: '#dc2626',
            }}>
              You've reached the seat limit for your {tierLabel} plan.{' '}
              <Link href="/pricing" style={{ color: '#dc2626', fontWeight: '600' }}>Upgrade to add more seats →</Link>
            </div>
          ) : (
            <form onSubmit={handleInvite} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                required
                style={{
                  flex: 1,
                  minWidth: '220px',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '7px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!inviteEmail}
                style={{
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  backgroundColor: inviteEmail ? '#2563eb' : '#e5e7eb',
                  color: inviteEmail ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: '7px',
                  cursor: inviteEmail ? 'pointer' : 'default',
                  whiteSpace: 'nowrap',
                }}
              >
                Send invite
              </button>
            </form>
          )}

          {inviteError && (
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#dc2626' }}>{inviteError}</p>
          )}
          {inviteSuccess && (
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#16a34a' }}>✓ {inviteSuccess}</p>
          )}
        </div>
      )}

      {/* ── Members list ──────────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f3f4f6' }}>
          <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#111827' }}>
            Team members
          </h2>
        </div>

        {members.length === 0 ? (
          <p style={{ padding: '1.5rem', color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>
            No team members yet. Invite someone above to get started.
          </p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {members.map((m, i) => (
              <li
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.9rem 1.5rem',
                  borderTop: i === 0 ? 'none' : '1px solid #f3f4f6',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                {/* Avatar + info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: m.role === 'owner' ? '#1a3a5c' : '#6366f1',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    flexShrink: 0,
                  }}>
                    {m.invited_email[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.invited_email}
                      {m.invited_email === currentUserEmail && (
                        <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', color: '#6b7280' }}>(you)</span>
                      )}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>
                      {m.role === 'owner' ? 'Account owner' : 'Member'} ·{' '}
                      {m.accepted_at
                        ? `Joined ${new Date(m.accepted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : `Invited ${new Date(m.invited_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                    </p>
                  </div>
                </div>

                {/* Status badge + remove */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                  <span style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    backgroundColor: m.status === 'active' ? '#dcfce7' : '#fef9c3',
                    color: m.status === 'active' ? '#166534' : '#854d0e',
                  }}>
                    {m.status === 'active' ? 'Active' : 'Pending'}
                  </span>

                  {isOwner && m.role !== 'owner' && (
                    <button
                      onClick={() => handleRemove(m.id, m.invited_email)}
                      disabled={removingId === m.id}
                      title="Remove member"
                      style={{
                        background: 'none',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        padding: '0.25rem 0.6rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        fontWeight: '600',
                      }}
                    >
                      {removingId === m.id ? '…' : 'Remove'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Info footer ───────────────────────────────────────────────────── */}
      <p style={{ marginTop: '1rem', fontSize: '0.775rem', color: '#9ca3af', lineHeight: 1.6 }}>
        Team members share your organization's hangar request pool.
        Removing a member immediately revokes their access.
        Pending invitations count toward your seat limit.
      </p>

    </div>
  )
}
