'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type ChatDrawerPayload = {
  conversationId?: string      // open an existing conversation
  brokerProfileId?: string     // or start a new one with this broker
  brokerName: string
  listingId?: string
  currentUserId: string
}

type Message = {
  id: string
  body: string
  sender_id: string
  read: boolean
  created_at: string
}

// ─── Global event bus ──────────────────────────────────────────────────────────
export function openChat(payload: ChatDrawerPayload) {
  window.dispatchEvent(new CustomEvent('open-chat', { detail: payload }))
}
export function closeChat() {
  window.dispatchEvent(new CustomEvent('close-chat'))
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function ChatDrawer() {
  const [payload, setPayload]         = useState<ChatDrawerPayload | null>(null)
  const [conversationId, setConvoId]  = useState<string | null>(null)
  const [messages, setMessages]       = useState<Message[]>([])
  const [input, setInput]             = useState('')
  const [sending, setSending]         = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const bottomRef                     = useRef<HTMLDivElement>(null)
  const inputRef                      = useRef<HTMLTextAreaElement>(null)

  // ── Listen for open/close events ──────────────────────────────────────────
  useEffect(() => {
    function onOpen(e: Event) {
      const p = (e as CustomEvent<ChatDrawerPayload>).detail
      setPayload(p)
      setMessages([])
      setInput('')
      setError(null)
      if (p.conversationId) {
        setConvoId(p.conversationId)
      } else {
        setConvoId(null)
      }
    }
    function onClose() { setPayload(null) }
    window.addEventListener('open-chat', onOpen)
    window.addEventListener('close-chat', onClose)
    return () => {
      window.removeEventListener('open-chat', onOpen)
      window.removeEventListener('close-chat', onClose)
    }
  }, [])

  // ── Fetch messages when conversation is known ─────────────────────────────
  const fetchMessages = useCallback(async (cid: string) => {
    setLoading(true)
    const res = await fetch(`/api/conversations/${cid}/messages`)
    if (res.ok) {
      const { messages: msgs } = await res.json()
      setMessages(msgs ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (conversationId) fetchMessages(conversationId)
  }, [conversationId, fetchMessages])

  // ── Scroll to bottom when messages change ─────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Auto-focus input when drawer opens ───────────────────────────────────
  useEffect(() => {
    if (payload) setTimeout(() => inputRef.current?.focus(), 300)
  }, [payload])

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const msg = payload.new as Message
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  // ── Send message ──────────────────────────────────────────────────────────
  async function send() {
    const text = input.trim()
    if (!text || sending || !payload) return
    setSending(true)
    setError(null)

    try {
      if (conversationId) {
        // Existing conversation
        const res = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: text }),
        })
        if (!res.ok) throw new Error('Failed to send')
        const { message } = await res.json()
        setMessages(prev => prev.find(m => m.id === message.id) ? prev : [...prev, message])
      } else {
        // New conversation
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
        const { conversation_id, message } = await res.json()
        setConvoId(conversation_id)
        setMessages([message])
        // Notify MessageBell to refresh
        window.dispatchEvent(new Event('conversations-updated'))
      }
      setInput('')
    } catch {
      setError('Could not send message. Please try again.')
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

  if (!payload) return null

  const isOpen = !!payload

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setPayload(null)}
        style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.25)',
          backdropFilter: 'blur(2px)',
          zIndex: 5000,
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: '100%',
        maxWidth: '420px',
        backgroundColor: 'white',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
        zIndex: 5001,
        display: 'flex',
        flexDirection: 'column',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #f3f4f6',
          flexShrink: 0,
        }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '50%',
            backgroundColor: '#eef2ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: '600', fontSize: '0.95rem', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {payload.brokerName}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Verified Broker</div>
          </div>
          <button
            onClick={() => setPayload(null)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#6b7280', padding: '4px', borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '1rem 1.25rem',
          display: 'flex', flexDirection: 'column', gap: '0.65rem',
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem', paddingTop: '2rem' }}>
              Loading…
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: '3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', color: '#d1d5db' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                Send a message to start the conversation.
              </p>
            </div>
          ) : (
            messages.map(msg => {
              const isMine = msg.sender_id === payload.currentUserId
              return (
                <div key={msg.id} style={{
                  display: 'flex',
                  justifyContent: isMine ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    maxWidth: '78%',
                    padding: '0.6rem 0.9rem',
                    borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    backgroundColor: isMine ? '#6366f1' : '#f3f4f6',
                    color: isMine ? 'white' : '#111827',
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}>
                    {msg.body}
                    <div style={{
                      fontSize: '0.65rem',
                      marginTop: '0.25rem',
                      color: isMine ? 'rgba(255,255,255,0.65)' : '#9ca3af',
                      textAlign: isMine ? 'right' : 'left',
                    }}>
                      {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '0 1.25rem 0.5rem', color: '#dc2626', fontSize: '0.8rem' }}>
            {error}
          </div>
        )}

        {/* Input */}
        <div style={{
          padding: '0.875rem 1.25rem',
          borderTop: '1px solid #f3f4f6',
          display: 'flex', gap: '0.6rem', alignItems: 'flex-end',
          flexShrink: 0,
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message…"
            rows={1}
            style={{
              flex: 1,
              padding: '0.6rem 0.85rem',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              fontSize: '0.875rem',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              maxHeight: '120px',
              overflowY: 'auto',
              backgroundColor: '#f9fafb',
            }}
            onInput={e => {
              const t = e.target as HTMLTextAreaElement
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            style={{
              width: '40px', height: '40px', borderRadius: '12px',
              backgroundColor: input.trim() && !sending ? '#6366f1' : '#e5e7eb',
              border: 'none', cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.15s',
              color: input.trim() && !sending ? 'white' : '#9ca3af',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}
