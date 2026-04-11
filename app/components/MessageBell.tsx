'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { openChat } from './ChatDrawer'

type Conversation = {
  id: string
  last_message_at: string
  unread_count: number
  buyer: { id: string; raw_user_meta_data: { full_name?: string; name?: string; email?: string } } | null
  broker_profile: { id: string; full_name: string; avatar_url: string | null; user_id: string } | null
  latest_message: { body: string; sender_id: string; created_at: string } | null
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function MessageBell({
  initialUnread,
  currentUserId,
  isBroker,
  brokerName,
}: {
  initialUnread: number
  currentUserId: string
  isBroker: boolean
  brokerName?: string
}) {
  const [open, setOpen]       = useState(false)
  const [unread, setUnread]   = useState(initialUnread)
  const [convos, setConvos]   = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const ref                   = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const fetchConvos = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/conversations')
    if (res.ok) {
      const { conversations } = await res.json()
      const list: Conversation[] = conversations ?? []
      setConvos(list)
      setUnread(list.reduce((s, c) => s + c.unread_count, 0))
    }
    setLoading(false)
  }, [])

  // Refresh when a new message is sent from the drawer
  useEffect(() => {
    window.addEventListener('conversations-updated', fetchConvos)
    return () => window.removeEventListener('conversations-updated', fetchConvos)
  }, [fetchConvos])

  // Realtime: new message from someone else → bump unread + stale the list
  useEffect(() => {
    const channel = supabase
      .channel('message-bell')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const msg = payload.new as { sender_id: string; conversation_id: string }
        if (msg.sender_id !== currentUserId) {
          setUnread(n => n + 1)
          // Re-fetch the conversation list so the new message appears in the bell
          fetchConvos()
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [currentUserId, fetchConvos])

  async function handleOpen() {
    setOpen(o => !o)
    if (!open) await fetchConvos()
  }

  function handleConvoClick(c: Conversation) {
    setOpen(false)
    // Determine the other party's name
    const otherName = isBroker
      ? (c.buyer?.raw_user_meta_data?.full_name ?? c.buyer?.raw_user_meta_data?.name ?? 'Buyer')
      : (c.broker_profile?.full_name ?? 'Broker')

    // Mark as read locally
    setConvos(prev => prev.map(x => x.id === c.id ? { ...x, unread_count: 0 } : x))
    setUnread(prev => Math.max(0, prev - c.unread_count))

    openChat({
      conversationId: c.id,
      brokerName: isBroker ? otherName : (c.broker_profile?.full_name ?? 'Broker'),
      currentUserId,
    })
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Icon button */}
      <button
        onClick={handleOpen}
        aria-label="Messages"
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '34px', height: '34px', borderRadius: '50%',
          background: open ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.2)',
          cursor: 'pointer', color: '#e2e8f0',
          transition: 'background 0.15s', flexShrink: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '-3px', right: '-3px',
            minWidth: '17px', height: '17px', borderRadius: '9999px',
            backgroundColor: 'rgba(239,68,68,0.92)',
            backdropFilter: 'blur(4px)',
            color: 'white', fontSize: '0.6rem', fontWeight: '500',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', lineHeight: 1,
            border: '1.5px solid rgba(255,255,255,0.25)',
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          width: '320px', backgroundColor: 'white',
          borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          border: '1px solid #e5e7eb', overflow: 'hidden', zIndex: 4000,
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.85rem 1rem 0.7rem', borderBottom: '1px solid #f3f4f6',
          }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
              Messages
            </span>
          </div>

          {/* List */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
                Loading…
              </div>
            ) : convos.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.6rem', color: '#d1d5db' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#9ca3af' }}>No messages yet</p>
              </div>
            ) : (
              convos.map(c => {
                const otherName = isBroker
                  ? (c.buyer?.raw_user_meta_data?.full_name ?? c.buyer?.raw_user_meta_data?.name ?? 'Buyer')
                  : (c.broker_profile?.full_name ?? 'Broker')
                const hasUnread = c.unread_count > 0
                return (
                  <button
                    key={c.id}
                    onClick={() => handleConvoClick(c)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                      width: '100%', padding: '0.75rem 1rem',
                      background: hasUnread ? '#f8faff' : 'white',
                      border: 'none', borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'background 0.1s',
                    }}
                  >
                    {/* Avatar placeholder */}
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      backgroundColor: '#eef2ff', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.85rem', fontWeight: '600', color: '#6366f1',
                    }}>
                      {otherName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                        <span style={{ fontSize: '0.825rem', fontWeight: hasUnread ? '600' : '500', color: '#111827' }}>
                          {otherName}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#9ca3af', flexShrink: 0, marginLeft: '0.5rem' }}>
                          {timeAgo(c.latest_message?.created_at ?? c.last_message_at)}
                        </span>
                      </div>
                      {c.latest_message && (
                        <p style={{
                          margin: 0, fontSize: '0.775rem', color: hasUnread ? '#374151' : '#9ca3af',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          fontWeight: hasUnread ? '500' : '400',
                        }}>
                          {c.latest_message.sender_id === currentUserId ? 'You: ' : ''}{c.latest_message.body}
                        </p>
                      )}
                    </div>
                    {hasUnread && (
                      <span style={{
                        flexShrink: 0, minWidth: '18px', height: '18px', borderRadius: '9999px',
                        backgroundColor: 'rgba(99,102,241,0.85)', color: 'white',
                        fontSize: '0.65rem', fontWeight: '600',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 4px', marginTop: '2px',
                      }}>
                        {c.unread_count}
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
