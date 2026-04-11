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
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map(w => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: '#eef2ff', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36 + 'px', fontWeight: '600', color: '#6366f1',
      letterSpacing: '-0.02em',
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
  isBroker?: boolean    // kept for compat but no longer used
  brokerName?: string
}) {
  const [open, setOpen]         = useState(false)
  const [unread, setUnread]     = useState(initialUnread)
  const [convos, setConvos]     = useState<Conversation[]>([])
  const [loading, setLoading]   = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const ref                     = useRef<HTMLDivElement>(null)

  // ── Close dropdown on outside click ─────────────────────────────────────
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // ── Fetch conversation list ───────────────────────────────────────────────
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

  // ── Refresh when a message is sent from the ChatDrawer ───────────────────
  useEffect(() => {
    window.addEventListener('conversations-updated', fetchConvos)
    return () => window.removeEventListener('conversations-updated', fetchConvos)
  }, [fetchConvos])

  // ── Realtime: new message → bump badge + refresh list ────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('message-bell-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as { sender_id: string; conversation_id: string }
          // Only react to messages from others
          if (msg.sender_id !== currentUserId) {
            setUnread(n => n + 1)
            // Re-fetch to get accurate preview + unread counts
            fetchConvos()
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUserId, fetchConvos])

  // ── Toggle dropdown ───────────────────────────────────────────────────────
  async function handleOpen() {
    const next = !open
    setOpen(next)
    if (next) await fetchConvos()
  }

  // ── Open a conversation ───────────────────────────────────────────────────
  function handleConvoClick(c: Conversation) {
    setOpen(false)
    // Optimistic read
    setConvos(prev => prev.map(x => x.id === c.id ? { ...x, unread_count: 0 } : x))
    setUnread(prev => Math.max(0, prev - c.unread_count))

    openChat({
      conversationId: c.id,
      brokerName: c.other_party.name,
      otherPartyRole: c.other_party.role,
      currentUserId,
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* ── Bell icon button ─────────────────────────────────────────── */}
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
            backgroundColor: '#ef4444',
            color: 'white', fontSize: '0.6rem', fontWeight: '700',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', lineHeight: 1,
            border: '1.5px solid rgba(26,58,92,0.8)',
            animation: 'none',
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ───────────────────────────────────────────── */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          width: '340px',
          backgroundColor: 'white',
          borderRadius: '14px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          zIndex: 4000,
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.9rem 1rem 0.75rem',
            borderBottom: '1px solid #f3f4f6',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#111827' }}>
                Messages
              </span>
              {unread > 0 && (
                <span style={{
                  padding: '0.1rem 0.45rem', borderRadius: '9999px',
                  backgroundColor: '#eef2ff', color: '#6366f1',
                  fontSize: '0.72rem', fontWeight: '700',
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
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {loading && convos.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
                Loading conversations…
              </div>
            ) : fetchError ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#dc2626' }}>{fetchError}</p>
                <button
                  onClick={fetchConvos}
                  style={{
                    padding: '0.4rem 0.85rem', borderRadius: '6px',
                    backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb',
                    fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', color: '#374151',
                  }}
                >
                  Try again
                </button>
              </div>
            ) : convos.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db"
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ marginBottom: '0.75rem' }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#9ca3af', fontWeight: '500' }}>
                  No conversations yet
                </p>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: '#d1d5db' }}>
                  Message a broker from any listing to get started.
                </p>
              </div>
            ) : (
              convos.map(c => {
                const hasUnread = c.unread_count > 0
                const preview = c.latest_message
                const isMyMessage = preview?.sender_id === currentUserId

                return (
                  <button
                    key={c.id}
                    onClick={() => handleConvoClick(c)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                      width: '100%', padding: '0.85rem 1rem',
                      background: hasUnread ? '#f8f9ff' : 'white',
                      border: 'none', borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6' }}
                    onMouseLeave={e => { e.currentTarget.style.background = hasUnread ? '#f8f9ff' : 'white' }}
                  >
                    <Avatar name={c.other_party.name} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Name + time row */}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', marginBottom: '0.2rem',
                      }}>
                        <span style={{
                          fontSize: '0.85rem',
                          fontWeight: hasUnread ? '700' : '600',
                          color: '#111827',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          maxWidth: '150px',
                        }}>
                          {c.other_party.name}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#9ca3af', flexShrink: 0, marginLeft: '0.5rem' }}>
                          {timeAgo(preview?.created_at ?? c.last_message_at)}
                        </span>
                      </div>

                      {/* Role badge */}
                      <div style={{ marginBottom: '0.25rem' }}>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: '600',
                          color: c.other_party.role === 'broker' ? '#6366f1' : '#059669',
                          backgroundColor: c.other_party.role === 'broker' ? '#eef2ff' : '#ecfdf5',
                          padding: '0.05rem 0.4rem', borderRadius: '9999px',
                        }}>
                          {c.other_party.role === 'broker' ? '✓ Verified Broker' : 'Buyer'}
                        </span>
                      </div>

                      {/* Message preview */}
                      {preview ? (
                        <p style={{
                          margin: 0, fontSize: '0.78rem',
                          color: hasUnread ? '#374151' : '#9ca3af',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          fontWeight: hasUnread ? '500' : '400',
                        }}>
                          {isMyMessage ? (
                            <span style={{ color: '#9ca3af' }}>You: </span>
                          ) : null}
                          {preview.body}
                        </p>
                      ) : (
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#d1d5db', fontStyle: 'italic' }}>
                          No messages yet
                        </p>
                      )}
                    </div>

                    {/* Unread badge */}
                    {hasUnread && (
                      <span style={{
                        flexShrink: 0, minWidth: '20px', height: '20px', borderRadius: '9999px',
                        backgroundColor: '#6366f1', color: 'white',
                        fontSize: '0.65rem', fontWeight: '700',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 5px', marginTop: '4px',
                      }}>
                        {c.unread_count > 99 ? '99+' : c.unread_count}
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
