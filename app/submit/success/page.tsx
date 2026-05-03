import Link from 'next/link'
import { CheckCircle, ClipboardList, Search, ArrowRight, Zap } from 'lucide-react'
import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase-server'
import { isVerifiedBroker } from '@/lib/auth-broker'

// Uses auth cookies — never prerender statically.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Listing Submitted | Hangar Marketplace',
}

type Props = {
  searchParams: Promise<{ photos?: string }>
}

export default async function SubmitSuccessPage({ searchParams }: Props) {
  const { photos } = await searchParams
  const photoCount = parseInt(photos ?? '0', 10)

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  // Source from broker_profiles, not user_metadata.
  const isBroker = await isVerifiedBroker(user)

  const dashboardHref = isBroker ? '/broker/dashboard' : '/dashboard'

  const steps = isBroker
    ? [
        { icon: <Zap size={18} />, title: 'Live immediately', desc: 'As a verified broker your listing is approved automatically — pilots can find it right now.' },
        { icon: <Search size={18} />, title: 'Pilots find you', desc: 'Anyone searching at your airport will see your listing in results.' },
        { icon: <ClipboardList size={18} />, title: 'Manage from your dashboard', desc: 'Edit details, track views, and respond to inquiries from your broker dashboard.' },
      ]
    : [
        { icon: <ClipboardList size={18} />, title: 'Review', desc: 'Our team reviews your listing for accuracy and completeness, usually within 24 hours.' },
        { icon: <CheckCircle size={18} />, title: 'Approval email', desc: "You'll get an email the moment your listing goes live on Hangar Marketplace." },
        { icon: <Search size={18} />, title: 'Pilots find you', desc: 'Pilots searching at your airport will see your listing immediately after approval.' },
      ]

  return (
    <div style={{
      maxWidth: '560px',
      margin: '4rem auto',
      textAlign: 'center',
      padding: '0 1rem',
    }}>
      <div style={{ marginBottom: '1.5rem', color: '#16a34a' }}>
        <CheckCircle size={64} strokeWidth={1.5} />
      </div>

      <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.75rem', color: '#111827', fontWeight: '800' }}>
        {isBroker ? 'Listing is live!' : 'Listing submitted!'}
      </h1>
      <p style={{ margin: '0 0 2rem', color: '#6b7280', fontSize: '1rem', lineHeight: 1.6 }}>
        {isBroker
          ? `Your listing is now live on Hangar Marketplace${photoCount > 0 ? ` with ${photoCount} photo${photoCount !== 1 ? 's' : ''}` : ''}. Pilots can find it immediately.`
          : `${photoCount > 0 ? `Your listing has been submitted with ${photoCount} photo${photoCount !== 1 ? 's' : ''}. ` : 'Your listing has been submitted. '}Our team will review it and it will go live typically within 24 hours. You'll receive an email confirmation once it's approved.`
        }
      </p>

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

        {steps.map((step, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: '0.875rem',
              alignItems: 'flex-start',
              padding: '0.875rem 0',
              borderBottom: i < steps.length - 1 ? '1px solid #f3f4f6' : 'none',
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

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          href={dashboardHref}
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
