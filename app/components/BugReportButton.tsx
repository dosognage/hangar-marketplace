'use client'

/**
 * BugReportButton
 *
 * A fixed floating button in the bottom-right corner of every page.
 * When clicked, opens a modal where the user can describe the issue.
 * On submit, POSTs to /api/bug-report with the description and the
 * last 5 minutes of captured logs from BugReportProvider.
 */

import { useState, useCallback, useEffect } from 'react'
import { AlertTriangle, X, Send, ChevronDown } from 'lucide-react'
import { useBugReport } from './BugReportProvider'
import type { BugReportPayload } from '@/lib/bug-report-types'

type Props = {
  /** Pre-fill the contact email if the user is logged in */
  userEmail?: string | null
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

// ── Styles ────────────────────────────────────────────────────────────────

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.875rem',
  fontFamily: 'Arial, sans-serif',
  color: '#111827',
  backgroundColor: 'white',
  boxSizing: 'border-box',
  outline: 'none',
  resize: 'vertical',
}

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: '700',
  color: '#374151',
  marginBottom: '0.35rem',
}

// ── Component ─────────────────────────────────────────────────────────────

export default function BugReportButton({ userEmail }: Props) {
  const { getLogs } = useBugReport()
  const [open, setOpen]           = useState(false)
  const [expanded, setExpanded]   = useState(false)   // log preview accordion
  const [description, setDesc]    = useState('')
  const [email, setEmail]         = useState(userEmail ?? '')
  const [submitState, setSubmit]  = useState<SubmitState>('idle')
  const [errorMsg, setErrorMsg]   = useState('')

  // Scroll-lock when modal is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Reset form state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setDesc('')
      setEmail(userEmail ?? '')
      setSubmit('idle')
      setErrorMsg('')
      setExpanded(false)
    }
  }, [open, userEmail])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return

    setSubmit('submitting')
    setErrorMsg('')

    const logs = getLogs()

    const payload: BugReportPayload = {
      description: description.trim(),
      userEmail:   email.trim() || undefined,
      pageUrl:     window.location.href,
      userAgent:   navigator.userAgent,
      screen:      { width: window.screen.width, height: window.screen.height },
      logs,
      submittedAt: new Date().toISOString(),
    }

    try {
      const res = await fetch('/api/bug-report', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Server error ${res.status}`)
      }

      setSubmit('success')
      setTimeout(() => setOpen(false), 2800)
    } catch (err: unknown) {
      setSubmit('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }, [description, email, getLogs])

  const logs = open ? getLogs() : []

  return (
    <>
      {/* ── Floating trigger button ─────────────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Report a technical issue"
        title="Report an issue"
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 1500,
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.5rem 0.9rem',
          backgroundColor: 'rgba(17, 24, 39, 0.88)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '999px',
          fontSize: '0.78rem',
          fontWeight: '600',
          fontFamily: 'Arial, sans-serif',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          letterSpacing: '0.01em',
          transition: 'background-color 0.15s, transform 0.1s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(17,24,39,0.97)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(17,24,39,0.88)' }}
        onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)' }}
        onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
      >
        <AlertTriangle size={13} strokeWidth={2.5} />
        <span className="bug-btn-label">Report Issue</span>
      </button>

      {/* ── Backdrop ────────────────────────────────────────────────────── */}
      {open && (
        <div
          role="presentation"
          onClick={() => submitState !== 'submitting' && setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            zIndex: 4000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          {/* ── Modal ─────────────────────────────────────────────────── */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bug-modal-title"
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '14px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
              width: '100%',
              maxWidth: '480px',
              overflow: 'hidden',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {/* Header */}
            <div style={{
              backgroundColor: '#1a3a5c',
              padding: '1.1rem 1.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} color="#93c5fd" strokeWidth={2.5} />
                <h2
                  id="bug-modal-title"
                  style={{ margin: 0, color: 'white', fontSize: '0.95rem', fontWeight: '700' }}
                >
                  Report a Technical Issue
                </h2>
              </div>
              <button
                onClick={() => submitState !== 'submitting' && setOpen(false)}
                aria-label="Close"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#93c5fd', padding: '0.2rem', borderRadius: '4px',
                  display: 'flex', alignItems: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.35rem 1.4rem' }}>

              {submitState === 'success' ? (
                /* ── Success state ────────────────────────────────────── */
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✓</div>
                  <p style={{ margin: '0 0 0.4rem', fontWeight: '700', fontSize: '1rem', color: '#166534' }}>
                    Report received — thank you!
                  </p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.5 }}>
                    We&apos;ve been notified and will look into it.
                    This window will close automatically.
                  </p>
                </div>
              ) : (
                /* ── Form state ───────────────────────────────────────── */
                <form onSubmit={handleSubmit} noValidate>

                  {/* What went wrong */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label htmlFor="bug-description" style={LABEL_STYLE}>
                      What went wrong? <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <textarea
                      id="bug-description"
                      required
                      rows={4}
                      placeholder="Describe what you were doing and what happened. The more detail, the faster we can fix it."
                      value={description}
                      onChange={e => setDesc(e.target.value)}
                      disabled={submitState === 'submitting'}
                      style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: '90px' }}
                    />
                  </div>

                  {/* Contact email */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label htmlFor="bug-email" style={LABEL_STYLE}>
                      Your email <span style={{ color: '#9ca3af', fontWeight: '400' }}>(optional — we&apos;ll follow up if needed)</span>
                    </label>
                    <input
                      id="bug-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      disabled={submitState === 'submitting'}
                      style={INPUT_STYLE}
                    />
                  </div>

                  {/* Current page (read-only) */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={LABEL_STYLE}>Page</label>
                    <div style={{
                      ...INPUT_STYLE,
                      backgroundColor: '#f9fafb',
                      color: '#6b7280',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      cursor: 'default',
                    }}>
                      {typeof window !== 'undefined' ? window.location.href : ''}
                    </div>
                  </div>

                  {/* Collapsible log preview */}
                  {logs.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <button
                        type="button"
                        onClick={() => setExpanded(x => !x)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '0.78rem',
                          color: '#6366f1',
                          fontWeight: '600',
                          fontFamily: 'Arial, sans-serif',
                        }}
                      >
                        <ChevronDown
                          size={13}
                          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                        />
                        {expanded ? 'Hide' : 'Show'} activity log ({logs.length} events captured)
                      </button>

                      {expanded && (
                        <div style={{
                          marginTop: '0.5rem',
                          maxHeight: '140px',
                          overflowY: 'auto',
                          backgroundColor: '#0f172a',
                          borderRadius: '6px',
                          padding: '0.6rem 0.75rem',
                          fontFamily: 'monospace',
                          fontSize: '0.7rem',
                          lineHeight: 1.6,
                        }}>
                          {logs.map((entry, i) => {
                            const time = new Date(entry.ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            const color =
                              entry.type === 'js_error'      ? '#f87171' :
                              entry.type === 'console_error' ? '#fca5a5' :
                              entry.type === 'fetch_fail'    ? '#fb923c' :
                              entry.type === 'console_warn'  ? '#fbbf24' :
                              '#94a3b8' // nav
                            return (
                              <div key={i} style={{ color, marginBottom: '1px' }}>
                                <span style={{ color: '#475569', marginRight: '0.5rem' }}>{time}</span>
                                <span style={{ color: '#64748b', marginRight: '0.35rem' }}>[{entry.type}]</span>
                                {entry.message}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      <p style={{ margin: '0.4rem 0 0', fontSize: '0.73rem', color: '#9ca3af' }}>
                        This log (last 5 minutes of activity) will be included automatically.
                      </p>
                    </div>
                  )}

                  {/* Error message */}
                  {submitState === 'error' && (
                    <div style={{
                      padding: '0.65rem 0.85rem',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      marginBottom: '1rem',
                      fontSize: '0.825rem',
                      color: '#dc2626',
                    }}>
                      {errorMsg}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={!description.trim() || submitState === 'submitting'}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem',
                      padding: '0.7rem 1rem',
                      backgroundColor: !description.trim() ? '#9ca3af' : '#1a3a5c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: '700',
                      fontFamily: 'Arial, sans-serif',
                      cursor: !description.trim() || submitState === 'submitting' ? 'not-allowed' : 'pointer',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (description.trim() && submitState !== 'submitting')
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#254e7a'
                    }}
                    onMouseLeave={e => {
                      if (description.trim() && submitState !== 'submitting')
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1a3a5c'
                    }}
                  >
                    {submitState === 'submitting' ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}>
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                        </svg>
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send size={14} strokeWidth={2.5} />
                        Send Report
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
