'use client'

/**
 * ProfileMenu
 *
 * A profile icon that opens a dropdown with links to Saved, My Listings,
 * (optionally Admin), and a Logout button. Closes on outside click.
 * Receives the display name and isAdmin flag as props from the Server layout.
 */

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { logout } from '@/app/actions/auth'
import HeartIcon from './HeartIcon'
import { useSavedCount } from './SavedCountProvider'

type Props = {
  displayName: string
  isAdmin: boolean
  isBroker?: boolean
  brokerProfileId?: string
}

export default function ProfileMenu({ displayName, isAdmin, isBroker, brokerProfileId }: Props) {
  const { savedCount } = useSavedCount()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Profile icon button */}
      <button
        onClick={() => setOpen(o => !o)}
        title={displayName}
        aria-label="Open profile menu"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: open ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '9999px',
          padding: '0.3rem 0.65rem 0.3rem 0.4rem',
          cursor: 'pointer',
          color: '#e2e8f0',
          fontSize: '0.82rem',
          fontWeight: '500',
          transition: 'background 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        {/* Person icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
        {displayName}
        {/* Chevron */}
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          minWidth: '180px',
          backgroundColor: 'white',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          zIndex: 4000,
        }}>
          {/* Name header */}
          <div style={{
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #f3f4f6',
            fontSize: '0.8rem',
            color: '#6b7280',
          }}>
            Signed in as <strong style={{ color: '#111827' }}>{displayName}</strong>
          </div>

          {/* Links */}
          <div style={{ padding: '0.4rem 0' }}>
            <DropdownLink href="/saved">
              <HeartIcon filled={savedCount > 0} size={15} />
              Saved listings
              {savedCount > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  padding: '0.1rem 0.45rem',
                  lineHeight: 1.4,
                }}>
                  {savedCount}
                </span>
              )}
            </DropdownLink>
            <DropdownLink href="/dashboard">My listings</DropdownLink>
            <DropdownLink href="/settings">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Settings
            </DropdownLink>
            <DropdownLink href="/team">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Team
            </DropdownLink>
            {isBroker && brokerProfileId ? (
              <>
                <DropdownLink href="/broker/dashboard">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  My broker profile
                </DropdownLink>
              </>
            ) : (
              <DropdownLink href="/apply-broker">Apply as broker</DropdownLink>
            )}
            {isAdmin && <DropdownLink href="/admin">Admin</DropdownLink>}
          </div>

          {/* Logout */}
          <div style={{ borderTop: '1px solid #f3f4f6', padding: '0.4rem 0' }}>
            <form action={logout}>
              <button
                type="submit"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.55rem 1rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: '#dc2626',
                  fontWeight: '500',
                }}
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function DropdownLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.55rem 1rem',
        fontSize: '0.875rem',
        color: '#374151',
        textDecoration: 'none',
        fontWeight: '500',
      }}
    >
      {children}
    </Link>
  )
}
