/**
 * /pricing/host
 *
 * Host-facing tier comparison page. Prospects visit before signing up
 * or before adding a second listing. The dashboard /dashboard/billing
 * page handles existing-host upgrades; this one converts NEW hosts.
 *
 * Buyer-side pricing (request fees) lives at /pricing — see that page
 * for the buyer subscriptions ladder.
 */

import Link from 'next/link'
import { HOST_TIERS } from '@/lib/stripe'

export const metadata = {
  title: 'List your hangar | HangarMarketplace',
  description: 'Three ways to list your hangar on HangarMarketplace: Free for a single listing, Featured for visibility, Pro for unlimited and analytics.',
}

export default function HostPricingPage() {
  const tiers = [HOST_TIERS.free, HOST_TIERS.featured, HOST_TIERS.pro]

  return (
    <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 1.25rem 5rem' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <span style={chip}>For hangar owners &amp; FBOs</span>
        <h1 style={{ margin: '0 0 0.75rem', fontSize: '2.1rem', fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>
          List your hangar
        </h1>
        <p style={{ margin: '0 auto', maxWidth: '600px', fontSize: '1rem', color: '#6b7280', lineHeight: 1.7 }}>
          Three ways to put your hangar in front of pilots and corporate flight departments
          looking for storage. List for free, or upgrade for visibility and scale.
        </p>
      </div>

      {/* Tier cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem',
        marginBottom: '3.5rem',
      }}>
        {tiers.map(t => {
          const isHighlight = t.id === 'featured'
          const accent = t.id === 'pro' ? '#0891b2' : t.id === 'featured' ? '#1e40af' : '#374151'
          return (
            <div key={t.id} style={{
              backgroundColor: 'white',
              border: `2px solid ${isHighlight ? accent : '#e5e7eb'}`,
              borderRadius: '14px',
              padding: '1.75rem 1.5rem',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: isHighlight ? `0 10px 30px ${accent}1f` : 'none',
            }}>
              {isHighlight && (
                <span style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: accent,
                  color: 'white',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '0.25rem 0.8rem',
                  borderRadius: '9999px',
                  whiteSpace: 'nowrap',
                }}>
                  Most popular
                </span>
              )}

              <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>{t.label}</h3>
              <p style={{ margin: '0 0 1.25rem', fontSize: '0.78rem', color: '#6b7280' }}>
                {t.id === 'free'     && 'Get a single hangar listed at no cost.'}
                {t.id === 'featured' && 'Get noticed by serious pilots and FBOs.'}
                {t.id === 'pro'      && 'For brokers, FBOs, and multi-property operators.'}
              </p>

              {/* Price */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                  <span style={{ fontSize: '2.2rem', fontWeight: 800, color: accent }}>
                    {t.cents === 0 ? 'Free' : `$${(t.cents / 100).toFixed(0)}`}
                  </span>
                  {t.cents > 0 && (
                    <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>/month</span>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul style={{ margin: '0 0 1.75rem', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.55rem', flex: 1 }}>
                {t.features.map(f => (
                  <li key={f} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.875rem', color: '#374151', lineHeight: 1.5 }}>
                    <span style={{ color: '#16a34a', flexShrink: 0 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link href={t.id === 'free' ? '/listing/new' : `/dashboard/billing?upgrade=${t.id}`} style={{
                display: 'block',
                textAlign: 'center',
                padding: '0.75rem',
                backgroundColor: isHighlight ? accent : 'white',
                color: isHighlight ? 'white' : accent,
                border: `2px solid ${accent}`,
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 700,
                marginTop: 'auto',
              }}>
                {t.id === 'free'     && 'Start free →'}
                {t.id === 'featured' && 'Choose Featured →'}
                {t.id === 'pro'      && 'Choose Pro →'}
              </Link>
            </div>
          )
        })}
      </div>

      {/* FAQ */}
      <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem', fontWeight: 700, color: '#111827' }}>
        Common questions
      </h2>
      <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '3rem' }}>
        <Faq q="Do I pay a percentage of what tenants pay me?">
          No. The subscription is a flat monthly fee for the listing tier. Whatever you charge tenants is yours — we don&apos;t touch the transaction.
        </Faq>
        <Faq q="What happens to my listings if I cancel?">
          Your listings stay live on the Free tier (1 listing visible, 5 photos). Listings beyond the Free limit are paused and can be reactivated when you re-subscribe. We never delete your content.
        </Faq>
        <Faq q="Can I upgrade or downgrade later?">
          Yes. Switch tiers any time through your billing portal. Upgrades take effect immediately; downgrades take effect at the next renewal. No penalties.
        </Faq>
        <Faq q="What if my card payment fails?">
          You get a 14-day grace period to update your card before the tier drops to Free. You&apos;ll get email notifications throughout the window.
        </Faq>
        <Faq q="Is there a contract?">
          Monthly only. Cancel any time. No annual commitment.
        </Faq>
      </div>

      {/* Buyer-side callout */}
      <div style={{
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '1.5rem 1.75rem',
        textAlign: 'center',
      }}>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>
          Looking to find a hangar?
        </p>
        <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#6b7280' }}>
          Browse is free. Posting a hangar <em>request</em> has its own pricing.
        </p>
        <Link href="/pricing" style={{
          display: 'inline-block',
          padding: '0.5rem 1rem',
          backgroundColor: 'white',
          border: '1px solid #d1d5db',
          color: '#1f2937',
          borderRadius: '7px',
          fontSize: '0.825rem',
          fontWeight: 600,
          textDecoration: 'none',
        }}>
          See request pricing →
        </Link>
      </div>
    </main>
  )
}

const chip: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#eff6ff',
  color: '#1d4ed8',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  padding: '0.3rem 0.8rem',
  borderRadius: '9999px',
  marginBottom: '1rem',
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details style={{
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '0.85rem 1.25rem',
      backgroundColor: 'white',
    }}>
      <summary style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111827', cursor: 'pointer', listStyle: 'none' }}>
        {q}
      </summary>
      <div style={{ marginTop: '0.65rem', fontSize: '0.875rem', color: '#374151', lineHeight: 1.7 }}>
        {children}
      </div>
    </details>
  )
}
