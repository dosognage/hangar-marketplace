'use client'

/**
 * ProgressBar
 *
 * Slim indigo bar at the top of the screen during page transitions.
 *
 * Strategy (no external package required):
 *  1. Intercept anchor-tag clicks that trigger an internal navigation.
 *  2. Animate the bar from 0 → ~85% while the page loads.
 *  3. Watch usePathname() — when it changes the navigation finished, so
 *     snap to 100% and fade out.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'

export default function ProgressBar() {
  const [width, setWidth]     = useState(0)   // 0–100
  const [visible, setVisible] = useState(false)
  const pathname              = usePathname()
  const prevPath              = useRef(pathname)
  const running               = useRef(false)
  const intervalRef           = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = useCallback(() => {
    if (running.current) return
    running.current = true
    setVisible(true)
    setWidth(8)

    let w = 8
    intervalRef.current = setInterval(() => {
      // Ease toward 85%, slowing as we approach it
      const remaining = 85 - w
      w += Math.max(remaining * 0.12, 0.5)
      setWidth(Math.min(w, 85))
      if (w >= 85) clearInterval(intervalRef.current!)
    }, 150)
  }, [])

  const finish = useCallback(() => {
    if (!running.current) return
    clearInterval(intervalRef.current!)
    running.current = false
    setWidth(100)
    // After the bar fills: fade out, then reset
    const t1 = setTimeout(() => setVisible(false), 280)
    const t2 = setTimeout(() => setWidth(0),        580)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // Detect navigation complete via pathname change
  useEffect(() => {
    if (pathname !== prevPath.current) {
      prevPath.current = pathname
      finish()
    }
  }, [pathname, finish])

  // Intercept internal link clicks
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href') ?? ''
      // Skip external / hash / protocol links
      if (!href || href.startsWith('http') || href.startsWith('#') ||
          href.startsWith('mailto') || href.startsWith('tel')) return
      // Skip links to the same path
      if (href.split('?')[0] === pathname) return

      start()
    }

    // Capture phase so we see clicks before React's synthetic event handlers
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [pathname, start])

  // Also handle browser back/forward
  useEffect(() => {
    window.addEventListener('popstate', start)
    return () => window.removeEventListener('popstate', start)
  }, [start])

  if (!visible && width === 0) return null

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '3px',
        width: `${width}%`,
        backgroundColor: '#6366f1',
        zIndex: 99999,
        transition: width === 100
          ? 'width 0.25s ease-out'
          : 'width 0.15s linear',
        opacity: visible ? 1 : 0,
        boxShadow: '0 0 10px rgba(99, 102, 241, 0.55)',
        pointerEvents: 'none',
      }}
    />
  )
}
