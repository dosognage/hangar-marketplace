import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Application Submitted | Hangar Marketplace',
}

export default function ApplyBrokerSuccessPage() {
  return (
    <div style={{ maxWidth: '560px', margin: '4rem auto', padding: '0 1.25rem' }}>
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        padding: '3rem 2.5rem',
        textAlign: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        {/* Icon */}
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          backgroundColor: '#f0fdf4', border: '2px solid #bbf7d0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem', fontSize: '2rem',
        }}>
          ✅
        </div>

        <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.5rem', color: '#111827' }}>
          Application submitted!
        </h1>
        <p style={{ margin: '0 0 2rem', color: '#6b7280', lineHeight: 1.7, fontSize: '0.95rem' }}>
          Our team will review your credentials and notify you at your account
          email once you&apos;re verified. This typically takes <strong>1–2 business days</strong>.
        </p>

        {/* What happens next */}
        <div style={{
          backgroundColor: '#f8fafc', border: '1px solid #e5e7eb',
          borderRadius: '10px', padding: '1.25rem', marginBottom: '2rem',
          textAlign: 'left',
        }}>
          <p style={{ margin: '0 0 0.75rem', fontWeight: '700', fontSize: '0.85rem', color: '#374151' }}>
            What happens next
          </p>
          {[
            'We verify your real estate license with your state commission',
            'You'll receive an email confirmation once approved',
            'Your public broker profile goes live immediately',
            'Listings you submit go live without waiting for review',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', marginBottom: i < 3 ? '0.6rem' : 0 }}>
              <span style={{
                flexShrink: 0, width: '20px', height: '20px', borderRadius: '50%',
                backgroundColor: '#dbeafe', color: '#1d4ed8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.65rem', fontWeight: '800', marginTop: '1px',
              }}>
                {i + 1}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
        </div>

        <Link href="/dashboard" style={{
          display: 'inline-block', width: '100%', boxSizing: 'border-box',
          padding: '0.85rem', backgroundColor: '#111827', color: 'white',
          borderRadius: '8px', textDecoration: 'none',
          fontWeight: '700', fontSize: '0.95rem',
        }}>
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
