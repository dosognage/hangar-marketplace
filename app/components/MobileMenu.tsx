'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/',               label: 'Browse' },
  { href: '/airport-homes',  label: 'Airport Homes' },
  { href: '/brokers',        label: 'Brokers' },
  { href: '/submit',         label: 'List a Property' },
]

export default function MobileMenu() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <button
        className="mobile-hamburger"
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        style={{
          display: 'none', // shown via CSS on mobile
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'white',
          padding: '0.4rem',
          borderRadius: '6px',
        }}
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 2999,
          }}
        />
      )}

      {/* Drawer */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '260px',
          height: '100dvh',
          backgroundColor: '#1a3a5c',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.3)',
          zIndex: 3000,
          display: 'flex',
          flexDirection: 'column',
          padding: '1.25rem 1.5rem',
          gap: '0.25rem',
          transform: open ? 'translateX(0)' : 'translateX(110%)',
          transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
          <button
            onClick={() => setOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#93c5fd', padding: '0.25rem' }}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {NAV_LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              color: pathname === link.href ? 'white' : '#93c5fd',
              textDecoration: 'none',
              fontSize: '1rem',
              fontWeight: pathname === link.href ? '700' : '500',
              padding: '0.75rem 0.5rem',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'block',
            }}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </>
  )
}
