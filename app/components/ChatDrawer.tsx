'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Public payload type ───────────────────────────────────────────────────────

export type ChatDrawerPayload = {
  conversationId?: string       // open an existing conversation
  brokerProfileId?: string      // or start a new one with this broker
  brokerName: string            // display name for the other party
  otherPartyRole?: 'buyer' | 'broker'
  listingId?: string
  currentUserId: string
}

// ─── Internal types ────────────────────────────────────────────────────────────

type Message = {
  id: string
  body: string
  sender_id: string
  read: boolean
  created_at: string
  pending?: boolean   // optimistic message not yet confirmed by server
  error?: boolean     // failed to send
}

// ─── Global event bus ─────────────────────────────────────────────────────────

export function openChat(payload: ChatDrawerPayload) {
  window.dispatchEvent(new CustomEvent('open-chat', { detail: payload }))
}
export function closeChat() {
  window.dispatchEvent(new CustomEvent('close-chat'))
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatDrawer() {
  const [payload, setPayload]        = useState<ChatDrawerPayload | null>(null)
  const [conversationId, setConvoId] = useState<string | null>(null)
  const [messages, setMessages]      = useState<Message[]>([])
  const [input, setInput]            = useState('')
  const [sending, setSending]        = useState(false)
  const [loading, setLoading]        = useState(false)
  const [loadError, setLoadError]    = useState<string | null>(null)
  const bottomRef                    = useRef<HTMLDivElement>(null)
  const inputRef                     = useRef<HTMLTextAreaElement>(null)
  const messagesBoxRef               = useRef<HTMLDivElement>(null)

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  // ── Fetch messages ────────────────────────────────────────────────────────
  // Declared first so the open-event effect can reference it.
  const fetchMessages = useCallback(async (cid: string) => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(`/api/conversations/${cid}/messages`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { messages: msgs } = await res.json()
      setMessages(msgs ?? [])
      // Bell needs to know messages are now read
      window.dispatchEvent(new Event('conversations-updated'))
    } catch {
      setLoadError('Could not load messages. Tap to retry.')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Open / close events ───────────────────────────────────────────────────
  useEffect(() => {
    function onOpen(e: Event) {
      const p = (e as CustomEvent<ChatDrawerPayload>).detail
      setPayload(p)
      setMessages([])
      setInput('')
      setLoadError(null)

      if (p.conversationId) {
        setConvoId(prev => {
          if (prev === p.conversationId) {
            // Same conversation reopened — effect won't fire, fetch manually
            fetchMessages(p.conversationId!)
          }
          return p.conversationId!
        })
      } else {
        setConvoId(null)
      }
    }

    function onClose() {
      setPayload(null)
    }

    window.addEventListener('open-chat', onOpen)
    window.addEventListener('close-chat', onClose)
    return () => {
      window.removeEventListener('open-chat', onOpen)
      window.removeEventListener('close-chat', onClose)
    }
  }, [fetchMessages])

  // ── Fetch when conversationId changes ─────────────────────────────────────
  useEffect(() => {
    if (conversationId) fetchMessages(conversationId)
  }, [conversationId, fetchMessages])

  // ── Scroll to bottom on new messages ─────────────────────────────────────
  useEffect(() => {
    scrollToBottom(messages.length <= 20)
  }, [messages, scrollToBottom])

  // ── Auto-focus input when drawer opens ───────────────────────────────────
  useEffect(() => {
    if (payload) {
      const t = setTimeout(() => inputRef.current?.focus(), 350)
      return () => clearTimeout(t)
    }
  }, [payload])

  // ── Realtime subscription for new messages ────────────────────────────────
  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (evt) => {
          const incoming = evt.new as Message
          setMessages(prev => {
            // Deduplicate: replace matching optimistic message or ignore if already present
            const exists = prev.find(m => m.id === incoming.id)
            if (exists) return prev
            // Replace a pending message with the same body if one exists
            const pendingIdx = prev.findIndex(
              m => m.pending && m.body === incoming.body && m.sender_id === incoming.sender_id
            )
            if (pendingIdx !== -1) {
              const next = [...prev]
              next[pendingIdx] = incoming
              return next
            }
            return [...prev, incoming]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  // ── Send ──────────────────────────────────────────────────────────────────
  async function send() {
    const text = input.trim()
    if (!text || sending || !payload) return

    setSending(true)
    setInput('')

    // Optimistic message — shown immediately, replaced or flagged on response
    const tempId = `temp-${Date.now()}`
    const optimistic: Message = {
      id: tempId,
      body: text,
      sender_id: payload.currentUserId,
      read: false,
      created_at: new Date().toISOString(),
      pending: true,
    }
    setMessages(prev => [...prev, optimistic])

    // Restore input height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }

    try {
      let serverMsg: Message

      if (conversationId) {
        const res = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: text }),
        })
        if (!res.ok) throw new Error('Failed to send')
        const data = await res.json()
        serverMsg = data.message as Message
      } else {
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            broker_profile_id: payload.brokerProfileId,
            listing_id: payload.listingId ?? null,
            message: text,
          }),
        })
        if (!res.ok) throw new Error('Failed to send')
        const data = await res.json()
        setConvoId(data.conversation_id)
        serverMsg = data.message as Message
      }

      // Replace optimistic message with confirmed one
      setMessages(prev =>
        prev.map(m => m.id === tempId ? { ...serverMsg, pending: false } : m)
      )

      // Notify bell to refresh conversation list / unread counts
      window.dispatchEvent(new Event('conversations-updated'))

    } catch {
      // Mark the optimistic message as failed
      setMessages(prev =>
        prev.map(m => m.id === tempId ? { ...m, pending: false, error: true } : m)
      )
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  // ── Early return ──────────────────────────────────────────────────────────
  if (!payload) return null

  const isOpen = !!payload
  const otherPartyRole = payload.otherPartyRole ?? 'broker'
  const roleLabel = otherPartyRole === 'buyer' ? 'Buyer' : 'Verified Broker'

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────────────────── */}
      <div
        onClick={() => setPayload(null)}
        style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.28)',
          backdropFilter: 'blur(2px)',
          zIndex: 5000,
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 0.25s ease',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />

      {/* ── Drawer ───────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#ffffff',
          boxShadow: '-12px 0 50px rgba(0,0,0,0.18)',
          zIndex: 5001,
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.85rem',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #f0f0f0',
          flexShrink: 0,
          backgroundColor: 'white',
        }}>
          {/* Avatar */}
          <div style={{
            width: '42px', height: '42px', borderRadius: '50%',
            backgroundColor: otherPartyRole === 'broker' ? '#eef2ff' : '#ecfdf5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontSize: '1.1rem', fontWeight: '700',
            color: otherPartyRole === 'broker' ? '#6366f1' : '#059669',
          }}>
            {payload.brokerName.charAt(0).toUpperCase()}
          </div>

          {/* Name + role */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: '700', fontSize: '0.95rem', color: '#111827',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {payload.brokerName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '1px' }}>
              {otherPartyRole === 'broker' && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              )}
              <span style={{ fontSize: '0.72rem', color: otherPartyRole === 'broker' ? '#6366f1' : '#059669', fontWeight: '600' }}>
                {roleLabel}
              </span>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={() => setPayload(null)}
            aria-label="Close"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#9ca3af', padding: '6px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#374151'
              e.currentTarget.style.background = '#f3f4f6'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#9ca3af'
              e.currentTarget.style.background = 'none'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ── Message area ─────────────────────────────────────────────── */}
        <div
          ref={messagesBoxRef}
          style={{
            flex: 1, overflowY: 'auto',
            padding: '1rem 1.25rem 0.5rem',
            display: 'flex', flexDirection: 'column', gap: '0.5rem',
            backgroundColor: '#fafafa',
          }}
        >
          {loading && messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '4rem', gap: '0.75rem' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                border: '3px solid #e5e7eb', borderTopColor: '#6366f1',
                animation: 'spin 0.7s linear infinite',
              }} />
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#9ca3af' }}>Loading…</p>
            </div>
          ) : loadError ? (
            <div style={{ textAlign: 'center', paddingTop: '3rem' }}>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#dc2626' }}>{loadError}</p>
              {conversationId && (
                <button
                  onClick={() => fetchMessages(conversationId)}
                  style={{
                    padding: '0.45rem 1rem', borderRadius: '8px',
                    backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb',
                    fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', color: '#374151',
                  }}
                >
                  Retry
                </button>
              )}
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: '4rem' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                backgroundColor: '#eef2ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1"
                  strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <p style={{ margin: '0 0 0.35rem', fontSize: '0.925rem', fontWeight: '700', color: '#111827' }}>
                Start the conversation
              </p>
              <p style={{ margin: 0, fontSize: '0.825rem', color: '#9ca3af', maxWidth: '220px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
                Send a message to {payload.brokerName} below.
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => {
                const isMine = msg.sender_id === payload.currentUserId
                const prevMsg = messages[i - 1]
                const showDateSeparator =
                  !prevMsg ||
                  new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()

                return (
                  <div key={msg.id}>
                    {/* Date separator */}
                    {showDateSeparator && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        margin: '0.75rem 0 0.5rem',
                      }}>
                        <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
                        <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: '600', whiteSpace: 'nowrap' }}>
                          {new Date(msg.created_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric',
                            year: new Date(msg.created_at).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
                          })}
                        </span>
                        <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
                      </div>
                    )}

                    {/* Message bubble */}
                    <div style={{
                      display: 'flex',
                      justifyContent: isMine ? 'flex-end' : 'flex-start',
                      marginBottom: '0.1rem',
                    }}>
                      <div style={{
                        maxWidth: '80%',
                        padding: '0.6rem 0.95rem',
                        borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        backgroundColor: isMine
                          ? msg.error ? '#fef2f2' : msg.pending ? '#a5b4fc' : '#6366f1'
                          : '#ffffff',
                        color: isMine ? 'white' : '#111827',
                        fontSize: '0.9rem',
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                        boxShadow: isMine
                          ? 'none'
                          : '0 1px 3px rgba(0,0,0,0.08)',
                        border: isMine ? 'none' : '1px solid #f0f0f0',
                        opacity: msg.pending ? 0.75 : 1,
                        transition: 'opacity 0.2s, background-color 0.2s',
                      }}>
                        {msg.body}
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: isMine ? 'flex-end' : 'flex-start',
                          gap: '0.3rem',
                          marginTop: '0.3rem',
                          fontSize: '0.64rem',
                          color: isMine ? 'rgba(255,255,255,0.6)' : '#9ca3af',
                        }}>
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString('en-US', {
                              hour: 'numeric', minute: '2-digit',
                            })}
                          </span>
                          {isMine && (
                            msg.error ? (
                              <span style={{ color: '#fca5a5' }}>✕ Failed</span>
                            ) : msg.pending ? (
                              <span>sending…</span>
                            ) : (
                              <span style={{ color: 'rgba(255,255,255,0.7)' }}>✓</span>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}
          <div ref={bottomRef} style={{ height: '4px' }} />
        </div>

        {/* ── Input area ───────────────────────────────────────────────── */}
        <div style={{
          padding: '0.85rem 1.25rem',
          borderTop: '1px solid #f0f0f0',
          display: 'flex', gap: '0.65rem', alignItems: 'flex-end',
          flexShrink: 0, backgroundColor: 'white',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message…"
            rows={1}
            disabled={sending}
            style={{
              flex: 1,
              padding: '0.65rem 1rem',
              border: '1.5px solid #e5e7eb',
              borderRadius: '14px',
              fontSize: '0.9rem',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              maxHeight: '140px',
              overflowY: 'auto',
              backgroundColor: '#f9fafb',
              transition: 'border-color 0.15s',
              color: '#111827',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#6366f1' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb' }}
            onInput={e => {
              const t = e.target as HTMLTextAreaElement
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 140) + 'px'
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            aria-label="Send message"
            style={{
              width: '42px', height: '42px', borderRadius: '12px',
              backgroundColor: input.trim() && !sending ? '#6366f1' : '#e5e7eb',
              border: 'none',
              cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.15s, transform 0.1s',
              color: input.trim() && !sending ? 'white' : '#9ca3af',
            }}
            onMouseDown={e => {
              if (input.trim() && !sending) e.currentTarget.style.transform = 'scale(0.92)'
            }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            {sending ? (
              <div style={{
                width: '16px', height: '16px', borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white',
                animation: 'spin 0.6s linear infinite',
              }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
