import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: '404 — Page Not Found | Hangar Marketplace' }

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <h1 style={{ fontSize: '3rem', fontWeight: '800', color: '#111827', marginBottom: '0.5rem' }}>404</h1>
      <p style={{ fontSize: '1.1rem', color: '#6b7280', marginBottom: '2rem' }}>
        This page doesn't exist or has been moved.
      </p>
      <Link
        href="/"
        style={{
          backgroundColor: '#111827',
          color: 'white',
          padding: '0.65rem 1.5rem',
          borderRadius: '6px',
          textDecoration: 'none',
          fontWeight: '600',
          fontSize: '0.875rem',
        }}
      >
        Back to Browse →
      </Link>
    </div>
  )
}
