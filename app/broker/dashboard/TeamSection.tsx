'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

type TeamMember = {
  id: string
  full_name: string
  brokerage: string
  avatar_url: string | null
}

type Team = {
  id: string
  name: string
  description: string | null
  website: string | null
  logo_url: string | null
  owner_profile_id: string
}

type BrokerSearchResult = {
  id: string
  full_name: string
  brokerage: string
  avatar_url: string | null
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

export default function TeamSection({
  profileId,
  initialTeam,
  initialMembers,
}: {
  profileId: string
  initialTeam: Team | null
  initialMembers: TeamMember[]
}) {
  const [team, setTeam] = useState<Team | null>(initialTeam)
  const [members, setMembers] = useState<TeamMember[]>(initialMembers)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Create team form
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [createWebsite, setCreateWebsite] = useState('')

  // Edit team form
  const [showEdit, setShowEdit] = useState(false)
  const [editName, setEditName] = useState(team?.name ?? '')
  const [editDesc, setEditDesc] = useState(team?.description ?? '')
  const [editWebsite, setEditWebsite] = useState(team?.website ?? '')

  // Add member search
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<BrokerSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isOwner = team?.owner_profile_id === profileId

  function flash(msg: string, isError = false) {
    if (isError) { setError(msg); setSuccess('') }
    else { setSuccess(msg); setError('') }
    setTimeout(() => { setError(''); setSuccess('') }, 4000)
  }

  // ── Search available brokers ─────────────────────────────────────────────────
  useEffect(() => {
    if (!team || !isOwner) return
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!searchQ.trim()) { setSearchResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/broker/team/members?q=${encodeURIComponent(searchQ)}`)
        const data = await res.json()
        setSearchResults(data.brokers ?? [])
      } finally {
        setSearching(false)
      }
    }, 350)
  }, [searchQ, team, isOwner])

  // ── Create team ──────────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!createName.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/broker/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName.trim(), description: createDesc.trim() || null, website: createWebsite.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create team')
      setTeam(data.team)
      setMembers([]) // server will reload
      setShowCreate(false)
      flash('Team created!')
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Error', true)
    } finally {
      setLoading(false)
    }
  }

  // ── Update team ──────────────────────────────────────────────────────────────
  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/broker/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() || null, website: editWebsite.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to update')
      setTeam(data.team)
      setShowEdit(false)
      flash('Team updated!')
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Error', true)
    } finally {
      setLoading(false)
    }
  }

  // ── Add member ───────────────────────────────────────────────────────────────
  async function handleAddMember(broker: BrokerSearchResult) {
    setLoading(true)
    try {
      const res = await fetch('/api/broker/team/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broker_profile_id: broker.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to add member')
      setMembers(prev => [...prev, broker])
      setSearchResults(prev => prev.filter(b => b.id !== broker.id))
      setSearchQ('')
      flash(`${broker.full_name} added to the team!`)
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Error', true)
    } finally {
      setLoading(false)
    }
  }

  // ── Remove member ────────────────────────────────────────────────────────────
  async function handleRemoveMember(memberId: string, memberName: string) {
    if (!confirm(`Remove ${memberName} from the team?`)) return
    setLoading(true)
    try {
      const res = await fetch('/api/broker/team/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broker_profile_id: memberId }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      setMembers(prev => prev.filter(m => m.id !== memberId))
      flash(`${memberName} removed from the team.`)
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Error', true)
    } finally {
      setLoading(false)
    }
  }

  // ── Leave team ───────────────────────────────────────────────────────────────
  async function handleLeave() {
    if (!confirm('Leave this team?')) return
    setLoading(true)
    try {
      const res = await fetch('/api/broker/team/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broker_profile_id: profileId }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      setTeam(null)
      setMembers([])
      flash('You have left the team.')
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Error', true)
    } finally {
      setLoading(false)
    }
  }

  // ── Disband team ─────────────────────────────────────────────────────────────
  async function handleDisband() {
    if (!confirm('Disband this team? All members will be removed. This cannot be undone.')) return
    setLoading(true)
    try {
      const res = await fetch('/api/broker/team', { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      setTeam(null)
      setMembers([])
      flash('Team disbanded.')
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Error', true)
    } finally {
      setLoading(false)
    }
  }

  function avatarEl(name: string, avatarUrl: string | null, size = 32) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        backgroundColor: '#1a3a5c', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: size * 0.38, fontWeight: '700',
        border: '2px solid #e5e7eb',
      }}>
        {avatarUrl
          ? <img src={avatarUrl.startsWith('http') ? avatarUrl : `${SUPABASE_URL}/storage/v1/object/public/avatars/${avatarUrl}`} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : name.charAt(0).toUpperCase()
        }
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem' }}>
      <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#374151', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        🏢 My Team
      </h2>

      {/* Alerts */}
      {error && (
        <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '0.825rem', color: '#dc2626' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '0.825rem', color: '#15803d' }}>
          {success}
        </div>
      )}

      {/* ── No team ── */}
      {!team && !showCreate && (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1rem' }}>
            You&apos;re not part of a team yet. Create one to share listings with other brokers at your company.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              padding: '0.55rem 1.25rem', backgroundColor: '#6366f1', color: 'white',
              border: 'none', borderRadius: '8px', fontWeight: '600',
              fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            + Create a Team
          </button>
        </div>
      )}

      {/* ── Create form ── */}
      {!team && showCreate && (
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Team Name *</label>
            <input
              value={createName}
              onChange={e => setCreateName(e.target.value)}
              placeholder="e.g. Seitz Aviation"
              required
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Description</label>
            <textarea
              value={createDesc}
              onChange={e => setCreateDesc(e.target.value)}
              placeholder="Brief description of your brokerage team"
              rows={2}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Website</label>
            <input
              value={createWebsite}
              onChange={e => setCreateWebsite(e.target.value)}
              placeholder="https://yourbrokerage.com"
              type="url"
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="submit"
              disabled={loading || !createName.trim()}
              style={{ padding: '0.5rem 1.25rem', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '7px', fontWeight: '600', fontSize: '0.875rem', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Creating…' : 'Create Team'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#f9fafb', color: '#374151', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '0.875rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Existing team ── */}
      {team && !showEdit && (
        <div>
          {/* Team header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                <span style={{ fontWeight: '700', fontSize: '1rem', color: '#111827' }}>{team.name}</span>
                {isOwner && (
                  <span style={{ fontSize: '0.68rem', fontWeight: '700', backgroundColor: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe', borderRadius: '4px', padding: '0.1rem 0.4rem' }}>
                    OWNER
                  </span>
                )}
              </div>
              {team.description && <p style={{ margin: '0 0 0.25rem', fontSize: '0.825rem', color: '#6b7280' }}>{team.description}</p>}
              {team.website && (
                <a href={team.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#6366f1' }}>
                  {team.website.replace(/^https?:\/\//, '')} ↗
                </a>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link
                href={`/team/${team.id}`}
                target="_blank"
                style={{ fontSize: '0.78rem', color: '#6366f1', textDecoration: 'none', fontWeight: '500', padding: '0.3rem 0.7rem', border: '1px solid #c7d2fe', borderRadius: '6px', whiteSpace: 'nowrap' }}
              >
                View page ↗
              </Link>
              {isOwner && (
                <>
                  <button
                    onClick={() => { setEditName(team.name); setEditDesc(team.description ?? ''); setEditWebsite(team.website ?? ''); setShowEdit(true) }}
                    style={{ fontSize: '0.78rem', fontWeight: '600', padding: '0.3rem 0.7rem', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb', color: '#374151', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDisband}
                    disabled={loading}
                    style={{ fontSize: '0.78rem', fontWeight: '600', padding: '0.3rem 0.7rem', borderRadius: '6px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}
                  >
                    Disband
                  </button>
                </>
              )}
              {!isOwner && (
                <button
                  onClick={handleLeave}
                  disabled={loading}
                  style={{ fontSize: '0.78rem', fontWeight: '600', padding: '0.3rem 0.7rem', borderRadius: '6px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}
                >
                  Leave Team
                </button>
              )}
            </div>
          </div>

          {/* Members list */}
          <div style={{ marginBottom: isOwner ? '1rem' : 0 }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Members ({members.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {members.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '7px', border: '1px solid #f3f4f6', backgroundColor: '#fafafa' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {avatarEl(m.full_name, m.avatar_url, 28)}
                    <div>
                      <span style={{ fontWeight: '600', fontSize: '0.875rem', color: '#111827' }}>
                        {m.full_name}
                        {m.id === team.owner_profile_id && (
                          <span style={{ marginLeft: '0.35rem', fontSize: '0.65rem', fontWeight: '700', color: '#4338ca' }}>OWNER</span>
                        )}
                      </span>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>{m.brokerage}</p>
                    </div>
                  </div>
                  {isOwner && m.id !== profileId && (
                    <button
                      onClick={() => handleRemoveMember(m.id, m.full_name)}
                      title="Remove from team"
                      style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '5px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add member (owner only) */}
          {isOwner && (
            <div>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Add a Member
              </p>
              <div style={{ position: 'relative' }}>
                <input
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search verified brokers by name or brokerage…"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
                {searching && (
                  <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#9ca3af' }}>
                    Searching…
                  </span>
                )}
              </div>
              {searchResults.length > 0 && (
                <div style={{ marginTop: '0.4rem', border: '1px solid #e5e7eb', borderRadius: '7px', overflow: 'hidden' }}>
                  {searchResults.map(b => (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.5rem 0.75rem', borderBottom: '1px solid #f3f4f6', backgroundColor: 'white' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        {avatarEl(b.full_name, b.avatar_url, 28)}
                        <div>
                          <span style={{ fontWeight: '600', fontSize: '0.875rem', color: '#111827' }}>{b.full_name}</span>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>{b.brokerage}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddMember(b)}
                        disabled={loading}
                        style={{ fontSize: '0.78rem', fontWeight: '600', padding: '0.3rem 0.7rem', borderRadius: '6px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', color: '#15803d', cursor: 'pointer' }}
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {searchQ.trim() && !searching && searchResults.length === 0 && (
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: '#9ca3af' }}>No available verified brokers found.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Edit form ── */}
      {team && showEdit && (
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Team Name *</label>
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Description</label>
            <textarea
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              rows={2}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Website</label>
            <input
              value={editWebsite}
              onChange={e => setEditWebsite(e.target.value)}
              type="url"
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '0.5rem 1.25rem', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '7px', fontWeight: '600', fontSize: '0.875rem', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => setShowEdit(false)}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#f9fafb', color: '#374151', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '0.875rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
