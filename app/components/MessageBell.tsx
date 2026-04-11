'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { openChat } from './ChatDrawer'

// ─── Types ────────────────────────────────────────────────────────────────────

type OtherParty = {
  name: string
  role: 'buyer' | 'broker'
  avatar_url: string | null
  broker_profile_id: string | null
  user_id: string | null
}

type Conversation = {
  id: string
  last_message_at: string
  buyer_id: string
  broker_profile_id: string
  other_party: OtherParty
  latest_message: {
    id: string
    body: string
    sender_id: string
    created_at: string
    read: boolean
  } | null
  unread_count: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map(w => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36 + 'px', fontWeight: '700', color: 'white',
      letterSpacing: '-0.01em',
    }}>
      {initials || '?'}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MessageBell({
  initialUnread,
  currentUserId,
}: {
  initialUnread: number
  currentUserId: string
  isBroker?: boolean
  brokerName?: string
}) {
  const [open, setOpen]             = useState(false)
  const [unread, setUnread]         = useState(initialUnread)
  const [convos, setConvos]         = useState<Conversation[]>([])
  const [loading, setLoading]       = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isMobile, setIsMobile]     = useState(false)
  const ref                         = useRef<HTMLDivElement>(null)

  // ── Detect mobile ────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Close on outside click (desktop only) ────────────────────────────────
  useEffect(() => {
    if (isMobile) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [isMobile])

  // ── Prevent body scroll when mobile sheet is open ────────────────────────
  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isMobile, open])

  // ── Fetch conversations ───────────────────────────────────────────────────
  const fetchConvos = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/conversations')
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const { conversations } = await res.json()
      const list: Conversation[] = conversations ?? []
      setConvos(list)
      setUnread(list.reduce((s, c) => s + c.unread_count, 0))
    } catch (e) {
      console.error('[MessageBell] fetchConvos:', e)
      setFetchError('Could not load messages.')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Refresh when ChatDrawer sends a message ───────────────────────────────
  useEffect(() => {
    window.addEventListener('conversations-updated', fetchConvos)
    return () => window.removeEventListener('conversations-updated', fetchConvos)
  }, [fetchConvos])

  // ── Realtime: new message → bump badge + refresh ──────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('message-bell-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as { sender_id: string }
        if (msg.sender_id !== currentUserId) {
          setUnread(n => n + 1)
          fetchConvos()
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [currentUserId, fetchConvos])

  // ── Toggle ────────────────────────────────────────────────────────────────
  async function handleOpen() {
    const next = !open
    setOpen(next)
    if (next) await fetchConvos()
  }

  // ── Open conversation ─────────────────────────────────────────────────────
  function handleConvoClick(c: Conversation) {
    setOpen(false)
    setConvos(prev => prev.map(x => x.id === c.id ? { ...x, unread_count: 0 } : x))
    setUnread(prev => Math.max(0, prev - c.unread_count))
    openChat({
      conversationId: c.id,
      brokerName: c.other_party.name,
      otherPartyRole: c.other_party.role,
      currentUserId,
    })
  }

  // ── Shared conversation list content ──────────────────────────────────────
  function ConvoList() {
    if (loading && convos.length === 0) {
      return (
        <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '50%',
            border: '2.5px solid #e5e7eb', borderTopColor: '#6366f1',
            animation: 'spin 0.7s linear infinite', margin: '0 auto 0.75rem',
          }} />
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#9ca3af' }}>Loading…</p>
        </div>
      )
    }

    if (fetchError) {
      return (
        <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#dc2626' }}>{fetchError}</p>
          <button onClick={fetchConvos} style={{
            padding: '0.45rem 1rem', borderRadius: '8px',
            backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb',
            fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', color: '#374151',
          }}>Try again</button>
        </div>
      )
    }

    if (convos.length === 0) {
      return (
        <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1"
              strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <p style={{ margin: '0 0 0.3rem', fontSize: '0.95rem', fontWeight: '700', color: '#111827' }}>
            No conversations yet
          </p>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#9ca3af', lineHeight: 1.5 }}>
            Message a broker from any listing to get started.
          </p>
        </div>
      )
    }

    return (
      <div>
        {convos.map((c, i) => {
          const hasUnread  = c.unread_count > 0
          const preview    = c.latest_message
          const isMyMsg    = preview?.sender_id === currentUserId
          const isLast     = i === convos.length - 1

          return (
            <button
              key={c.id}
              onClick={() => handleConvoClick(c)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.9rem',
                width: '100%',
                padding: isMobile ? '1rem 1.25rem' : '0.85rem 1rem',
                background: hasUnread ? '#f8f9ff' : 'white',
                border: 'none',
                borderBottom: isLast ? 'none' : '1px solid #f3f4f6',
                cursor: 'pointer', textAlign: 'left',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6' }}
              onMouseLeave={e => { e.currentTarget.style.background = hasUnread ? '#f8f9ff' : 'white' }}
            >
              {/* Avatar with unread indicator dot */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar name={c.other_party.name} size={isMobile ? 48 : 44} />
                {hasUnread && (
                  <span style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: '13px', height: '13px', borderRadius: '50%',
                    backgroundColor: '#6366f1',
                    border: '2px solid white',
                  }} />
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.15rem' }}>
                  <span style={{
                    fontSize: isMobile ? '0.95rem' : '0.875rem',
                    fontWeight: hasUnread ? '700' : '600',
                    color: '#111827',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: '180px',
                  }}>
                    {c.other_party.name}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#9ca3af', flexShrink: 0, marginLeft: '0.5rem' }}>
                    {timeAgo(preview?.created_at ?? c.last_message_at)}
                  </span>
                </div>

                <p style={{
                  margin: 0,
                  fontSize: isMobile ? '0.85rem' : '0.78rem',
                  color: hasUnread ? '#374151' : '#9ca3af',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  fontWeight: hasUnread ? '500' : '400',
                  lineHeight: 1.4,
                }}>
                  {isMyMsg && <span style={{ color: '#9ca3af' }}>You: </span>}
                  {preview ? preview.body : <span style={{ fontStyle: 'italic' }}>No messages yet</span>}
                </p>

                {/* Role label — small, understated */}
                <p style={{
                  margin: '0.2rem 0 0',
                  fontSize: '0.68rem',
                  color: c.other_party.role === 'broker' ? '#6366f1' : '#059669',
                  fontWeight: '600',
                }}>
                  {c.other_party.role === 'broker' ? '✓ Verified Broker' : 'Buyer'}
                </p>
              </div>

              {/* Unread count badge */}
              {hasUnread && (
                <span style={{
                  flexShrink: 0, minWidth: '22px', height: '22px', borderRadius: '11px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white', fontSize: '0.65rem', fontWeight: '700',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 6px',
                }}>
                  {c.unread_count > 99 ? '99+' : c.unread_count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={ref} style={{ position: 'relative' }}>

      {/* ── Icon button ──────────────────────────────────────────────────── */}
      <button
        onClick={handleOpen}
        aria-label={unread > 0 ? `${unread} unread messages` : 'Messages'}
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '34px', height: '34px', borderRadius: '50%',
          background: open ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.2)',
          cursor: 'pointer', color: '#e2e8f0',
          transition: 'background 0.15s', flexShrink: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '-3px', right: '-3px',
            minWidth: '17px', height: '17px', borderRadius: '9999px',
            backgroundColor: '#ef4444', color: 'white',
            fontSize: '0.6rem', fontWeight: '700',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', lineHeight: 1,
            border: '1.5px solid rgba(26,58,92,0.8)',
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* ── Mobile: backdrop + bottom sheet ──────────────────────────────── */}
      {isMobile && open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(2px)',
              zIndex: 4998,
            }}
          />

          {/* Bottom sheet */}
          <div style={{
            position: 'fixed',
            bottom: 0, left: 0, right: 0,
            backgroundColor: 'white',
            borderRadius: '20px 20px 0 0',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.16)',
            zIndex: 4999,
            maxHeight: '78vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Drag handle */}
            <div style={{ padding: '0.75rem 0 0', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: '#e5e7eb' }} />
            </div>

            {/* Sheet header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.75rem 1.25rem 0.9rem',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: '800', color: '#111827' }}>Messages</span>
                {unread > 0 && (
                  <span style={{
                    padding: '0.1rem 0.5rem', borderRadius: '9999px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: 'white', fontSize: '0.72rem', fontWeight: '700',
                  }}>
                    {unread} new
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: '#f3f4f6', border: 'none', borderRadius: '50%',
                  width: '30px', height: '30px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#6b7280',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Conversation list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <ConvoList />
            </div>
          </div>
        </>
      )}

      {/* ── Desktop: positioned dropdown ─────────────────────────────────── */}
      {!isMobile && open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          width: '360px',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          zIndex: 4000,
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1rem 1.1rem 0.85rem',
            borderBottom: '1px solid #f3f4f6',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#111827' }}>Messages</span>
              {unread > 0 && (
                <span style={{
                  padding: '0.1rem 0.5rem', borderRadius: '9999px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white', fontSize: '0.72rem', fontWeight: '700',
                }}>
                  {unread} new
                </span>
              )}
            </div>
            {loading && (
              <div style={{
                width: '14px', height: '14px', borderRadius: '50%',
                border: '2px solid #e5e7eb', borderTopColor: '#6366f1',
                animation: 'spin 0.7s linear infinite',
              }} />
            )}
          </div>

          {/* Conversation list */}
          <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <ConvoList />
          </div>
        </div>
      )}
    </div>
  )
}
