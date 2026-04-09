import Link from 'next/link'
import { CheckCircle, ClipboardList, Search, ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Listing Submitted | Hangar Marketplace',
}

type Props = {
  searchParams: Promise<{ photos?: string }>
}

export default async function SubmitSuccessPage({ searchParams }: Props) {
  const { photos } = await searchParams
  const photoCount = parseInt(photos ?? '0', 10)

  return (
    <div style={{
      maxWidth: '560px',
      margin: '4rem auto',
      textAlign: 'center',
      padding: '0 1rem',
    }}>
      {/* Icon */}
      <div style={{ marginBottom: '1.5rem', color: '#16a34a' }}>
        <CheckCircle size={64} strokeWidth={1.5} />
      </div>

      {/* Heading */}
      <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.75rem', color: '#111827', fontWeight: '800' }}>
        Listing submitted!
      </h1>
      <p style={{ margin: '0 0 2rem', color: '#6b7280', fontSize: '1rem', lineHeight: 1.6 }}>
        {photoCount > 0
          ? `Your listing has been submitted with ${photoCount} photo${photoCount !== 1 ? 's' : ''}. `
          : 'Your listing has been submitted. '}
        Our team will review it and it will go live typically within 24 hours.
        You&apos;ll receive an email confirmation once it&apos;s approved.
      </p>

      {/* Steps card */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem',
        textAlign: 'left',
      }}>
        <p style={{ margin: '0 0 1rem', fontWeight: '700', fontSize: '0.875rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          What happens next
        </p>

        {[
          { icon: <ClipboardList size={18} />, title: 'Review', desc: 'Our team reviews your listing for accuracy and completeness, usually within 24 hours.' },
          { icon: <CheckCircle size={18} />, title: 'Approval email', desc: "You'll get an email the moment your listing goes live on Hangar Marketplace." },
          { icon: <Search size={18} />, title: 'Pilots find you', desc: 'Pilots searching at your airport will see your listing immediately after approval.' },
        ].map((step, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: '0.875rem',
              alignItems: 'flex-start',
              padding: '0.875rem 0',
              borderBottom: i < 2 ? '1px solid #f3f4f6' : 'none',
            }}
          >
            <div style={{ color: '#6366f1', flexShrink: 0, marginTop: '2px' }}>
              {step.icon}
            </div>
            <div>
              <p style={{ margin: '0 0 0.2rem', fontWeight: '600', fontSize: '0.9rem', color: '#111827' }}>
                {step.title}
              </p>
              <p style={{ margin: 0, fontSize: '0.825rem', color: '#6b7280', lineHeight: 1.5 }}>
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.65rem 1.35rem',
            backgroundColor: '#111827', color: 'white',
            borderRadius: '8px', textDecoration: 'none',
            fontWeight: '600', fontSize: '0.9rem',
          }}
        >
          Go to My Dashboard <ArrowRight size={15} />
        </Link>
        <Link
          href="/submit"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.65rem 1.35rem',
            backgroundColor: 'white', color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '8px', textDecoration: 'none',
            fontWeight: '600', fontSize: '0.9rem',
          }}
        >
          Submit another listing
        </Link>
      </div>
    </div>
  )
}
