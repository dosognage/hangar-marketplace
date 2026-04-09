'use client'

/**
 * BugReportProvider
 *
 * Wraps the entire application and silently intercepts:
 *   • window.onerror              → JS errors
 *   • window.onunhandledrejection  → unhandled promise rejections
 *   • console.error / console.warn → console noise
 *   • global fetch                 → non-2xx or network failures
 *   • pathname changes             → navigation trail
 *
 * Maintains a rolling buffer of up to MAX_ENTRIES log entries.
 * Entries older than WINDOW_MS are purged each time a new entry is added.
 * Exposes getLogs() so BugReportButton can read the current buffer.
 *
 * Uses useRef (not useState) so the buffer never causes re-renders.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react'
import { usePathname } from 'next/navigation'
import type { LogEntry, LogType } from '@/lib/bug-report-types'

const WINDOW_MS  = 5 * 60 * 1000  // 5 minutes
const MAX_ENTRIES = 250

// ── Context ─────────────────────────────────────────────────────────────────

type BugReportContextValue = {
  getLogs: () => LogEntry[]
}

const BugReportContext = createContext<BugReportContextValue>({
  getLogs: () => [],
})

export function useBugReport() {
  return useContext(BugReportContext)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function truncate(s: string, max = 400): string {
  return s.length > max ? s.slice(0, max) + '…' : s
}

function safeString(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Error) return value.message
  try { return JSON.stringify(value) } catch { return String(value) }
}

// ── Provider ─────────────────────────────────────────────────────────────────

export default function BugReportProvider({ children }: { children: React.ReactNode }) {
  const bufferRef = useRef<LogEntry[]>([])
  const pathname  = usePathname()

  // ── Core: add an entry to the rolling buffer ────────────────────────────
  const addEntry = useCallback((type: LogType, message: string, detail?: string) => {
    const now = Date.now()

    // Purge entries older than 5 minutes
    bufferRef.current = bufferRef.current.filter(e => now - e.ts < WINDOW_MS)

    // Cap size
    if (bufferRef.current.length >= MAX_ENTRIES) {
      bufferRef.current = bufferRef.current.slice(-MAX_ENTRIES + 1)
    }

    bufferRef.current.push({ ts: now, type, message: truncate(message), detail: detail ? truncate(detail) : undefined })
  }, [])

  // ── Track page navigations ───────────────────────────────────────────────
  useEffect(() => {
    addEntry('nav', `Navigated to ${pathname}`)
  }, [pathname, addEntry])

  // ── Intercept window.onerror ─────────────────────────────────────────────
  useEffect(() => {
    const orig = window.onerror
    window.onerror = (msg, src, line, col, err) => {
      const location = src ? ` (${src?.split('/').pop()}:${line}:${col})` : ''
      addEntry('js_error', String(msg) + location, err?.stack)
      return orig ? orig.call(window, msg, src, line, col, err) : false
    }
    return () => { window.onerror = orig }
  }, [addEntry])

  // ── Intercept unhandledrejection ─────────────────────────────────────────
  useEffect(() => {
    function handler(e: PromiseRejectionEvent) {
      const reason = e.reason instanceof Error ? e.reason : null
      addEntry(
        'js_error',
        reason ? `Unhandled rejection: ${reason.message}` : `Unhandled rejection: ${safeString(e.reason)}`,
        reason?.stack,
      )
    }
    window.addEventListener('unhandledrejection', handler)
    return () => window.removeEventListener('unhandledrejection', handler)
  }, [addEntry])

  // ── Intercept console.error / console.warn ───────────────────────────────
  useEffect(() => {
    const origError = console.error
    const origWarn  = console.warn

    console.error = (...args: unknown[]) => {
      const msg = args.map(safeString).join(' ')
      // Skip React internal noise (hydration warnings, etc.)
      if (!msg.includes('Warning: ')) {
        addEntry('console_error', msg)
      }
      origError.apply(console, args)
    }

    console.warn = (...args: unknown[]) => {
      const msg = args.map(safeString).join(' ')
      if (!msg.includes('Warning: ') && !msg.includes('React does not')) {
        addEntry('console_warn', msg)
      }
      origWarn.apply(console, args)
    }

    return () => {
      console.error = origError
      console.warn  = origWarn
    }
  }, [addEntry])

  // ── Intercept fetch for non-2xx and network failures ─────────────────────
  useEffect(() => {
    const origFetch = window.fetch

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const url = typeof args[0] === 'string'
        ? args[0]
        : args[0] instanceof URL
          ? args[0].toString()
          : (args[0] as Request).url

      // Only log calls to our own API (don't log Supabase, Resend, etc.)
      const isInternal = url.startsWith('/') || url.includes(window.location.host)

      try {
        const res = await origFetch(...args)
        if (!res.ok && isInternal) {
          addEntry(
            'fetch_fail',
            `${(args[1] as RequestInit)?.method ?? 'GET'} ${url.split('?')[0]} → ${res.status} ${res.statusText}`,
          )
        }
        return res
      } catch (err: unknown) {
        if (isInternal) {
          addEntry(
            'fetch_fail',
            `${(args[1] as RequestInit)?.method ?? 'GET'} ${url.split('?')[0]} → Network error`,
            err instanceof Error ? err.message : String(err),
          )
        }
        throw err
      }
    }

    return () => { window.fetch = origFetch }
  }, [addEntry])

  // ── Expose getLogs ───────────────────────────────────────────────────────
  const getLogs = useCallback((): LogEntry[] => {
    const cutoff = Date.now() - WINDOW_MS
    return bufferRef.current.filter(e => e.ts >= cutoff)
  }, [])

  return (
    <BugReportContext.Provider value={{ getLogs }}>
      {children}
    </BugReportContext.Provider>
  )
}
