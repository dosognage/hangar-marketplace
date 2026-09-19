'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Notification = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

async function markAllReadOnServer() {
  await fetch('/api/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ all: true }),
  }).catch(() => { /* the count self-corrects on the next page load */ })
}

export default function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen]       = useState(false)
  const [unread, setUnread]   = useState(initialUnread)
  const [items, setItems]     = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const ref                   = useRef<HTMLDivElement>(null)
  const router                = useRouter()

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      const { notifications } = await res.json()
      setItems(notifications ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  // Realtime: a new notification bumps the badge while the panel is closed.
  // While it is open the user is already looking, so refresh the list and
  // keep it marked seen instead.
  useEffect(() => {
    const channel = supabase
      .channel('notifications-bell')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      }, () => {
        if (open) {
          void fetchNotifications()
          void markAllReadOnServer()
        } else {
          setUnread(n => n + 1)
          setItems([])   // stale; refetch on next open
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [open, fetchNotifications])

  // Opening the panel counts as seeing everything in it: the badge clears
  // at once and the server is told in the background. The rows keep their
  // unseen highlight for this viewing (the list is fetched with the
  // pre-open read state) and show as seen from the next open onward.
  async function handleOpen() {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    const hadUnread = unread > 0
    setUnread(0)
    await fetchNotifications()
    if (hadUnread) void markAllReadOnServer()
  }

  function handleClick(n: Notification) {
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        aria-expanded={open}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          background: open ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.2)',
          cursor: 'pointer',
          color: '#e2e8f0',
          transition: 'background 0.15s',
          flexShrink: 0,
        }}
      >
        {/* Bell SVG */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>

        {/* Unread badge */}
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: '-3px',
            right: '-3px',
            minWidth: '17px',
            height: '17px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(239, 68, 68, 0.92)',
            backdropFilter: 'blur(4px)',
            color: 'white',
            fontSize: '0.6rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            lineHeight: 1,
            border: '1.5px solid rgba(255,255,255,0.25)',
            letterSpacing: '0.01em',
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Backdrop: mobile only, dims the page and gives a tap-to-close target. */}
      {open && (
        <div
          className="notif-mobile-backdrop"
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15,23,42,0.35)',
            zIndex: 3999,
          }}
        />
      )}

      {/* Dropdown. Grows out of the bell: anchored at its top-right corner,
          scales and fades in over one short beat. */}
      {open && (
        <div className="notif-dropdown" style={{
          position: 'absolute',
          top: 'calc(100% + 10px)',
          right: 0,
          width: '320px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          zIndex: 4000,
          transformOrigin: 'top right',
          animation: 'notifExpand 180ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        }}>
          <style>{`
            @keyframes notifExpand {
              from { opacity: 0; transform: translateY(-6px) scale(0.85); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes notifBackdropIn {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
            .notif-mobile-backdrop { animation: notifBackdropIn 180ms ease-out both; }
            @media (prefers-reduced-motion: reduce) {
              .notif-dropdown, .notif-mobile-backdrop { animation: none !important; }
            }
            /* On mobile (≤768px) switch to a fixed sheet that spans the
               viewport with a small inset margin, so the anchored 320px box
               never gets clipped off-screen. */
            @media (max-width: 768px) {
              .notif-dropdown {
                position: fixed !important;
                top: calc(env(safe-area-inset-top, 0px) + 64px) !important;
                left: 12px !important;
                right: 12px !important;
                width: auto !important;
                max-height: calc(100dvh - env(safe-area-inset-top, 0px) - 80px) !important;
                box-shadow: 0 10px 40px rgba(0,0,0,0.18) !important;
              }
            }
            @media (min-width: 769px) {
              .notif-mobile-backdrop { display: none; }
            }
          `}</style>

          {/* Header */}
          <div style={{
            padding: '0.85rem 1rem 0.7rem',
            borderBottom: '1px solid #f3f4f6',
          }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
              Notifications
            </span>
          </div>

          {/* List */}
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
                Loading…
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.6rem', color: '#d1d5db' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#9ca3af' }}>
                  No notifications yet
                </p>
              </div>
            ) : (
              items.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: n.read ? 'white' : '#f8faff',
                    border: 'none',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: n.link ? 'pointer' : 'default',
                    textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                >
                  {/* Unseen marker: a blue dot, or an empty slot so rows line up */}
                  <span
                    aria-hidden="true"
                    style={{
                      flexShrink: 0,
                      width: '8px',
                      height: '8px',
                      marginTop: '6px',
                      borderRadius: '50%',
                      backgroundColor: n.read ? 'transparent' : '#2563eb',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: '0 0 0.15rem',
                      fontSize: '0.825rem',
                      fontWeight: n.read ? '400' : '500',
                      color: '#111827',
                      lineHeight: 1.4,
                    }}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p style={{
                        margin: '0 0 0.25rem',
                        fontSize: '0.775rem',
                        color: '#6b7280',
                        lineHeight: 1.4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {n.body}
                      </p>
                    )}
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#9ca3af' }}>
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
