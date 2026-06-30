/**
 * Host billing / subscription management page.
 *
 * Shows the host's current tier, lets them upgrade/downgrade or cancel
 * via Stripe Customer Portal. New subscribers go through Checkout
 * (POST /api/subscriptions/checkout). Existing subscribers go through
 * the Portal (POST /api/subscriptions/portal).
 *
 * The pricing comparison itself lives on /pricing — this page is just
 * the host's status + actions.
 */
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { HOST_TIERS, type HostTier } from '@/lib/stripe'
import StartSubscriptionButton from '@/app/components/StartSubscriptionButton'
import OpenPortalButton from '@/app/components/OpenPortalButton'

interface SearchParams {
  success?:   string
  cancelled?: string
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { success, cancelled } = await searchParams

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/dashboard/billing')

  const { data: sub } = await supabaseAdmin
    .from('host_subscriptions')
    .select('tier, status, current_period_end, stripe_subscription_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const tier:   HostTier = (sub?.tier as HostTier) ?? 'free'
  const status         = sub?.status ?? 'active'
  const spec           = HOST_TIERS[tier]
  const periodEndDate  = sub?.current_period_end ? new Date(sub.current_period_end) : null
  const hasActiveStripeSub = !!sub?.stripe_subscription_id && status !== 'cancelled'

  return (
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
      <Link href="/dashboard" style={{ fontSize: '0.85rem', color: '#6b7280', textDecoration: 'none' }}>← Dashboard</Link>
      <h1 style={{ margin: '0.5rem 0 0.4rem', fontSize: '1.6rem', fontWeight: 800 }}>Billing</h1>
      <p style={{ margin: '0 0 1.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
        Manage your HangarMarketplace listing tier.
      </p>

      {/* Flash from the Stripe Checkout redirect */}
      {success === '1' && (
        <FlashCard variant="success">
          Subscription activated. Your listings are now {spec.label}.
        </FlashCard>
      )}
      {cancelled === '1' && (
        <FlashCard variant="neutral">
          Checkout cancelled. No charge was made.
        </FlashCard>
      )}

      {/* Current tier card */}
      <section style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Current tier
            </p>
            <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
              {spec.label}
            </p>
            {spec.cents > 0 && (
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
                ${(spec.cents / 100).toFixed(0)} / month
              </p>
            )}
          </div>
          <StatusBadge status={status} />
        </div>

        {periodEndDate && status !== 'cancelled' && (
          <p style={{ margin: '1rem 0 0', fontSize: '0.85rem', color: '#374151' }}>
            {status === 'grace_period'
              ? `Payment failed. Your subscription downgrades to Free on ${periodEndDate.toLocaleDateString()} if not resolved.`
              : status === 'trial'
                ? `Trial ends ${periodEndDate.toLocaleDateString()}.`
                : `Renews ${periodEndDate.toLocaleDateString()}.`}
          </p>
        )}

        {/* Features in this tier */}
        <ul style={{ margin: '1rem 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: '0.4rem' }}>
          {spec.features.map(f => (
            <li key={f} style={{ fontSize: '0.85rem', color: '#374151' }}>
              <span style={{ color: '#16a34a', marginRight: '0.5rem' }}>✓</span>
              {f}
            </li>
          ))}
        </ul>
      </section>

      {/* Actions */}
      <section style={{ marginTop: '1.25rem', display: 'grid', gap: '0.75rem' }}>
        {tier === 'free' && (
          <>
            <StartSubscriptionButton tier="featured" label="Upgrade to Featured · $99/mo" />
            <StartSubscriptionButton tier="pro"      label="Upgrade to Pro · $299/mo" />
            <Link href="/pricing" style={ghostLink}>Compare features →</Link>
          </>
        )}
        {tier === 'featured' && (
          <>
            <StartSubscriptionButton tier="pro" label="Upgrade to Pro · $299/mo" />
            {hasActiveStripeSub && (
              <OpenPortalButton label="Manage subscription, switch tier, or cancel" />
            )}
            <Link href="/pricing" style={ghostLink}>Compare features →</Link>
          </>
        )}
        {tier === 'pro' && hasActiveStripeSub && (
          <OpenPortalButton label="Manage subscription or cancel" />
        )}
      </section>
    </main>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; fg: string; label: string }> = {
    active:        { bg: '#dcfce7', fg: '#166534', label: 'Active' },
    trial:         { bg: '#dbeafe', fg: '#1e40af', label: 'Trial'  },
    grace_period:  { bg: '#fef3c7', fg: '#92400e', label: 'Payment failed · grace period' },
    cancelled:     { bg: '#f3f4f6', fg: '#6b7280', label: 'Cancelled' },
  }
  const s = styles[status] ?? styles.active
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.3rem 0.75rem',
      fontSize: '0.72rem',
      fontWeight: 700,
      backgroundColor: s.bg,
      color: s.fg,
      borderRadius: '999px',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    }}>
      {s.label}
    </span>
  )
}

function FlashCard({ children, variant }: { children: React.ReactNode; variant: 'success' | 'neutral' }) {
  const bg = variant === 'success' ? '#dcfce7' : '#f3f4f6'
  const fg = variant === 'success' ? '#166534' : '#374151'
  return (
    <div style={{
      marginBottom: '1.25rem',
      padding: '0.85rem 1rem',
      backgroundColor: bg,
      color: fg,
      borderRadius: '10px',
      fontSize: '0.875rem',
      fontWeight: 500,
    }}>
      {children}
    </div>
  )
}

const card: React.CSSProperties = {
  backgroundColor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '1.25rem 1.5rem',
}

const ghostLink: React.CSSProperties = {
  display: 'block',
  textAlign: 'center',
  padding: '0.65rem',
  color: '#374151',
  fontSize: '0.85rem',
  textDecoration: 'underline',
}
