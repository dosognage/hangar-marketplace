'use client'

/**
 * ToastProvider + useToast
 *
 * Usage:
 *   const { addToast } = useToast()
 *   addToast('Saved!', 'success')
 *   addToast('Something went wrong', 'error')
 */

import { createContext, useContext, useState, useCallback, useRef } from 'react'

type ToastType = 'success' | 'error' | 'info'

type Toast = {
  id: number
  message: string
  type: ToastType
  exiting: boolean
}

type ToastCtx = {
  addToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastCtx>({ addToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, message, type, exiting: false }])

    // Start exit animation after 2.6 s
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
    }, 2600)

    // Remove from DOM after animation completes (300 ms)
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 2900)
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* Toast stack — bottom-right */}
      <div style={{
        position: 'fixed', bottom: '24px', right: '24px',
        zIndex: 99999, display: 'flex', flexDirection: 'column',
        gap: '10px', pointerEvents: 'none',
      }}>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast }: { toast: Toast }) {
  const colors: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
    success: { bg: '#f0fdf4', border: '#86efac', icon: '✓', text: '#166534' },
    error:   { bg: '#fef2f2', border: '#fca5a5', icon: '✕', text: '#991b1b' },
    info:    { bg: '#eff6ff', border: '#93c5fd', icon: 'ℹ', text: '#1e40af' },
  }
  const c = colors[toast.type]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.65rem 1rem',
      backgroundColor: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      color: c.text,
      fontSize: '0.875rem',
      fontWeight: '500',
      pointerEvents: 'auto',
      minWidth: '200px',
      maxWidth: '320px',
      opacity: toast.exiting ? 0 : 1,
      transform: toast.exiting ? 'translateX(16px)' : 'translateX(0)',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
      animation: 'toastIn 0.25s ease',
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '20px', height: '20px', borderRadius: '50%',
        backgroundColor: c.border, fontSize: '0.75rem', fontWeight: '700', flexShrink: 0,
      }}>
        {c.icon}
      </span>
      {toast.message}
    </div>
  )
}
