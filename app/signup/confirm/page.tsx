import Link from 'next/link'
import { Mail } from 'lucide-react'
import { safeNextPath } from '@/lib/safe-redirect'

/**
 * Shown after signup when Supabase requires email confirmation.
 * If your Supabase project has "Confirm email" disabled, users are
 * logged in immediately and redirected to /dashboard instead.
 */
export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: rawNext } = await searchParams
  // Defence in depth — `next` is also sanitized in the login action,
  // but if a phishing link points directly at /signup/confirm with
  // a hostile next, the "Go to login" button would carry the bad
  // value into the login URL. Sanitizing here keeps the link clean.
  const next = safeNextPath(rawNext)
  const loginHref = next !== '/' ? `/login?next=${encodeURIComponent(next)}` : '/login'

  return (
    <div style={{ maxWidth: '420px', margin: '4rem auto', textAlign: 'center' }}>
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '2.5rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
      }}>
        <div style={{ marginBottom: '1rem', color: '#2563eb' }}><Mail size={48} strokeWidth={1.5} /></div>
        <h1 style={{ marginTop: 0 }}>Check your email</h1>
        <p style={{ color: '#6b7280', lineHeight: 1.6 }}>
          We sent a confirmation link to your email address. Click the link to
          activate your account, then come back and sign in.
        </p>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Didn&apos;t get it? Check your spam folder.
        </p>
        <Link
          href={loginHref}
          style={{
            display: 'inline-block',
            padding: '0.65rem 1.5rem',
            backgroundColor: '#111827',
            color: 'white',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '600',
          }}
        >
          Go to login
        </Link>
      </div>
    </div>
  )
}
