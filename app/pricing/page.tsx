'use client'

/**
 * /pricing
 *
 * Transparent, scalable pricing for one-time transient pilots,
 * priority users, and subscription-based commercial operators / dispatchers.
 *
 * - Annual / monthly toggle with 17% savings callout
 * - "Starting at" language throughout
 * - Per-request cost shown at every tier for easy comparison
 * - Feature matrix scales from individual pilot → enterprise dispatcher
 */

import { useState } from 'react'
import Link from 'next/link'

type Cadence = 'annual' | 'monthly'

// ── Pricing data ───────────────────────────────────────────────────────────

const ONE_TIME_PRICE     = 7.99
const PRIORITY_PRICE     = 29.99

const TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    audience: 'Active individual pilots',
    requests: 25,
    annualPrice: 149,
    monthlyPrice: 14.99,
    color: '#2563eb',
    highlight: false,
    features: [
      '25 hangar requests per year',
      'Standard placement on request board',
      'Email notification when owners reply',
      'Single-airport requests',
      '60-day active listing window',
      'Free 60-day refresh notifications',
      '1 team seat',
    ],
    notIncluded: [
      'Priority / urgent placement',
      'Multi-airport simultaneous requests',
      'Request analytics',
      'Team seats',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    audience: 'Small charter & flight departments',
    requests: 50,
    annualPrice: 249,
    monthlyPrice: 24.99,
    color: '#7c3aed',
    highlight: true,
    features: [
      '50 hangar requests per year',
      'Standard placement on request board',
      'Email notification when owners reply',
      'Multi-airport simultaneous requests',
      '60-day active listing window',
      'Free 60-day refresh notifications',
      'Priority add-on available ($29.99/request)',
      '3 team seats',
    ],
    notIncluded: [
      'Included priority placement',
      'Request analytics dashboard',
      'Dedicated account support',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    audience: 'Schedulers & mid-size operators',
    requests: 100,
    annualPrice: 399,
    monthlyPrice: 39.99,
    color: '#0891b2',
    highlight: false,
    features: [
      '100 hangar requests per year',
      'Priority placement on all requests',
      'Email notification when owners reply',
      'Multi-airport simultaneous requests',
      '60-day active listing window',
      'Free 60-day refresh notifications',
      'Priority add-on available ($29.99/request)',
      'Request analytics dashboard',
      '5 team seats',
    ],
    notIncluded: [
      'Unlimited requests',
      'Dedicated account manager',
      'Custom invoicing / NET-30',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    audience: 'Fractional, Part 135 & large operators',
    requests: null, // unlimited
    annualPrice: 799,
    monthlyPrice: 79.99,
    color: '#059669',
    highlight: false,
    features: [
      'Unlimited hangar requests',
      'Priority placement on all requests',
      'Urgent (48-hr) badge included',
      'Multi-airport simultaneous requests',
      '60-day active listing window',
      'Free 60-day refresh notifications',
      'Request analytics dashboard',
      'Unlimited team seats',
      'Dedicated account manager',
      'Custom invoicing / NET-30 billing',
      'API access for dispatch system integration',
    ],
    notIncluded: [],
  },
]

// ── Page ───────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [cadence, setCadence] = useState<Cadence>('annual')

  return (
    <div style={{ paddingBottom: '4rem' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: '3rem 0 2rem' }}>
        <span style={{
          display: 'inline-block',
          backgroundColor: '#eff6ff',
          color: '#1d4ed8',
          fontSize: '0.72rem',
          fontWeight: '700',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: '0.3rem 0.8rem',
          borderRadius: '9999px',
          marginBottom: '1rem',
        }}>
          Simple, transparent pricing
        </span>
        <h1 style={{ margin: '0 0 0.75rem', fontSize: '2rem', fontWeight: '800', color: '#111827', lineHeight: 1.2 }}>
          Pay only for what you post
        </h1>
        <p style={{ margin: '0 auto', maxWidth: '540px', fontSize: '1rem', color: '#6b7280', lineHeight: 1.7 }}>
          Listing your hangar is always free. Fees apply to hangar <strong>requests</strong> —
          priced to scale from a pilot needing a spot for the night all the way up to a
          corporate dispatcher managing dozens of aircraft.
        </p>
      </div>

      {/* ── Annual / Monthly toggle ────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
        <button
          onClick={() => setCadence('monthly')}
          style={toggleBtnStyle(cadence === 'monthly')}
        >
          Monthly
        </button>
        <button
          onClick={() => setCadence('annual')}
          style={toggleBtnStyle(cadence === 'annual')}
        >
          Annual
          <span style={{
            marginLeft: '0.4rem',
            backgroundColor: '#dcfce7',
            color: '#166534',
            fontSize: '0.65rem',
            fontWeight: '700',
            padding: '0.15rem 0.4rem',
            borderRadius: '9999px',
          }}>
            Save 17%
          </span>
        </button>
      </div>

      {/* ── One-time cards ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1rem' }}>
        <SectionLabel>Pay-per-request — no subscription needed</SectionLabel>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem',
        marginBottom: '2.5rem',
      }}>
        <OneTimeCard
          icon="✈"
          title="Standard Request"
          audience="Transient & weekend pilots"
          price={ONE_TIME_PRICE}
          priceNote="one-time, per request"
          accentColor="#374151"
          features={[
            'Single hangar request at any airport',
            'Visible on the request board immediately',
            'Email notification when an owner replies',
            '60-day active window — free to refresh',
            'No account required — email only',
          ]}
          cta="Post a request"
          ctaHref="/requests/new"
        />
        <OneTimeCard
          icon="⚡"
          title="High-Priority Request"
          audience="Day-of & 48-hour urgent needs"
          price={PRIORITY_PRICE}
          priceNote="one-time, per request"
          accentColor="#b45309"
          urgent
          features={[
            'Everything in Standard, plus:',
            '"Urgent" badge — pinned to top of board',
            'Push notifications to nearby hangar owners',
            'Ideal for diversions, last-minute charters',
            'Response window tracked & displayed',
          ]}
          cta="Post urgent request"
          ctaHref="/requests/new"
        />
      </div>

      {/* ── Subscription tier cards ────────────────────────────────────────── */}
      <div style={{ marginBottom: '1rem' }}>
        <SectionLabel>Subscription plans — best value for frequent flyers & commercial operators</SectionLabel>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '1rem',
        marginBottom: '3rem',
      }}>
        {TIERS.map(tier => (
          <SubscriptionCard key={tier.id} tier={tier} cadence={cadence} />
        ))}
      </div>

      {/* ── How pricing works ──────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '2rem 2.5rem',
        marginBottom: '3rem',
      }}>
        <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.15rem', fontWeight: '700', color: '#111827' }}>
          How pricing works
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
        }}>
          <HowItWorksItem
            icon="🏠"
            title="Listing is always free"
            body="Hangar owners and brokers list their space at no cost. The marketplace is free to supply."
          />
          <HowItWorksItem
            icon="📋"
            title="Requests have a fee"
            body="Posting a hangar request — telling the market what you need — is where fees apply. This keeps the board high-quality and noise-free."
          />
          <HowItWorksItem
            icon="📉"
            title="Volume lowers your per-request cost"
            body={`A one-time request costs $${ONE_TIME_PRICE}. A Professional subscription brings that down to ~$3.99 per request across 100 posts.`}
          />
          <HowItWorksItem
            icon="🔄"
            title="60-day refresh is always free"
            body="If your request hasn't been filled after 60 days, we'll notify you to refresh it. Refreshing keeps you active — at no extra charge."
          />
        </div>
      </div>

      {/* ── Per-request cost comparison table ─────────────────────────────── */}
      <h2 style={{ margin: '0 0 1rem', fontSize: '1.15rem', fontWeight: '700', color: '#111827' }}>
        Cost per request — at a glance
      </h2>
      <div style={{ overflowX: 'auto', marginBottom: '3rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <Th>Plan</Th>
              <Th>Best for</Th>
              <Th>Requests included</Th>
              <Th>Price</Th>
              <Th>Cost per request</Th>
            </tr>
          </thead>
          <tbody>
            <CompRow label="Standard" audience="Transient pilots" requests="1" price={`$${ONE_TIME_PRICE}`} perReq={`$${ONE_TIME_PRICE}`} />
            <CompRow label="High-Priority" audience="Urgent / day-of" requests="1" price={`$${PRIORITY_PRICE}`} perReq={`$${PRIORITY_PRICE}`} highlight />
            {TIERS.map(t => {
              const price = cadence === 'annual' ? t.annualPrice : t.monthlyPrice
              const priceLabel = cadence === 'annual'
                ? `$${price}/yr`
                : `$${price}/mo`
              const reqCount  = t.requests ?? '∞'
              const perReq    = t.requests
                ? `~$${(t.annualPrice / t.requests).toFixed(2)}`
                : 'Unlimited'
              return (
                <CompRow
                  key={t.id}
                  label={t.name}
                  audience={t.audience}
                  requests={String(reqCount)}
                  price={priceLabel}
                  perReq={perReq}
                  highlight={t.highlight}
                />
              )
            })}
          </tbody>
        </table>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
          * Per-request cost calculated on annual plan. Monthly plans ~17% higher.
        </p>
      </div>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <h2 style={{ margin: '0 0 1rem', fontSize: '1.15rem', fontWeight: '700', color: '#111827' }}>
        Frequently asked questions
      </h2>
      <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '3rem' }}>
        <Faq q="Can I upgrade or downgrade my subscription at any time?">
          Yes. You can change your plan at any time through the billing portal. Upgrades take effect immediately; downgrades take effect at your next renewal date. Unused requests do not roll over between billing periods.
        </Faq>
        <Faq q="What counts as a 'request'?">
          Each hangar space request you post counts as one request against your allocation. Refreshing an existing request (at the 60-day mark) does not consume an additional request — only new posts do.
        </Faq>
        <Faq q="Can multiple dispatchers share one account?">
          Growth and above include multiple team seats. Enterprise includes unlimited seats, making it the right choice for full dispatch teams or flight departments where several people manage requests.
        </Faq>
        <Faq q="Is there a free trial?">
          Listing a hangar is completely free — no trial needed. For requests, we don't offer a free trial, but a one-time Standard request at $7.99 lets you test the platform before committing to a subscription.
        </Faq>
        <Faq q="How do I cancel?">
          You can cancel your subscription at any time through the billing portal — no penalty, no phone call required. Your subscription remains active until the end of the paid period.
        </Faq>
        <Faq q="Do you offer NET-30 or custom invoicing for enterprise accounts?">
          Yes. Enterprise plans can be invoiced monthly or quarterly on NET-30 terms. Contact us at <a href="mailto:andre.dosogne@outlook.com" style={{ color: '#2563eb' }}>andre.dosogne@outlook.com</a> to set this up.
        </Faq>
      </div>

      {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
      <div style={{
        textAlign: 'center',
        padding: '2.5rem',
        backgroundColor: '#1a3a5c',
        borderRadius: '12px',
        color: 'white',
      }}>
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.35rem', fontWeight: '700' }}>
          Ready to find your next hangar?
        </h2>
        <p style={{ margin: '0 0 1.5rem', color: '#93c5fd', fontSize: '0.9rem' }}>
          Browse available hangars for free, or post your first request from $7.99.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{
            padding: '0.65rem 1.5rem',
            backgroundColor: 'rgba(255,255,255,0.12)',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: '600',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            Browse hangars →
          </Link>
          <Link href="/requests/new" style={{
            padding: '0.65rem 1.5rem',
            backgroundColor: '#2563eb',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: '600',
          }}>
            Post a request — from $7.99
          </Link>
        </div>
      </div>

    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      margin: 0,
      fontSize: '0.72rem',
      fontWeight: '700',
      letterSpacing: '0.07em',
      textTransform: 'uppercase',
      color: '#9ca3af',
    }}>
      {children}
    </p>
  )
}

function OneTimeCard({
  icon, title, audience, price, priceNote, accentColor, urgent = false, features, cta, ctaHref,
}: {
  icon: string
  title: string
  audience: string
  price: number
  priceNote: string
  accentColor: string
  urgent?: boolean
  features: string[]
  cta: string
  ctaHref: string
}) {
  return (
    <div style={{
      backgroundColor: 'white',
      border: `2px solid ${urgent ? '#fbbf24' : '#e5e7eb'}`,
      borderRadius: '12px',
      padding: '1.5rem',
      position: 'relative',
    }}>
      {urgent && (
        <span style={{
          position: 'absolute',
          top: '-11px',
          left: '1.25rem',
          backgroundColor: '#f59e0b',
          color: 'white',
          fontSize: '0.65rem',
          fontWeight: '800',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          padding: '0.2rem 0.6rem',
          borderRadius: '9999px',
        }}>
          ⚡ High Priority
        </span>
      )}
      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{icon}</div>
      <h3 style={{ margin: '0 0 0.2rem', fontSize: '1rem', fontWeight: '700', color: '#111827' }}>{title}</h3>
      <p style={{ margin: '0 0 1rem', fontSize: '0.775rem', color: '#6b7280' }}>{audience}</p>

      {/* Price */}
      <div style={{ marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: '600' }}>Starting at</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginTop: '0.2rem' }}>
          <span style={{ fontSize: '2rem', fontWeight: '800', color: accentColor }}>${price}</span>
          <span style={{ fontSize: '0.775rem', color: '#9ca3af' }}>{priceNote}</span>
        </div>
      </div>

      <ul style={{ margin: '0 0 1.5rem', padding: '0 0 0 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {features.map(f => (
          <li key={f} style={{ fontSize: '0.825rem', color: '#374151', lineHeight: 1.5 }}>{f}</li>
        ))}
      </ul>

      <Link href={ctaHref} style={{
        display: 'block',
        textAlign: 'center',
        padding: '0.6rem',
        backgroundColor: urgent ? '#f59e0b' : '#111827',
        color: 'white',
        borderRadius: '7px',
        textDecoration: 'none',
        fontSize: '0.825rem',
        fontWeight: '600',
      }}>
        {cta}
      </Link>
    </div>
  )
}

function SubscriptionCard({ tier, cadence }: { tier: typeof TIERS[number]; cadence: Cadence }) {
  const price      = cadence === 'annual' ? tier.annualPrice : tier.monthlyPrice
  const perReq     = tier.requests ? (tier.annualPrice / tier.requests).toFixed(2) : null
  const savingsMsg = cadence === 'annual'
    ? `~$${(tier.monthlyPrice * 12 - tier.annualPrice).toFixed(0)} saved vs monthly`
    : null

  return (
    <div style={{
      backgroundColor: 'white',
      border: `2px solid ${tier.highlight ? tier.color : '#e5e7eb'}`,
      borderRadius: '12px',
      padding: '1.5rem',
      position: 'relative',
      boxShadow: tier.highlight ? `0 4px 20px ${tier.color}22` : 'none',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {tier.highlight && (
        <span style={{
          position: 'absolute',
          top: '-11px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: tier.color,
          color: 'white',
          fontSize: '0.65rem',
          fontWeight: '800',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          padding: '0.2rem 0.75rem',
          borderRadius: '9999px',
          whiteSpace: 'nowrap',
        }}>
          Most popular
        </span>
      )}

      {/* Header */}
      <h3 style={{ margin: '0 0 0.15rem', fontSize: '1rem', fontWeight: '700', color: '#111827' }}>{tier.name}</h3>
      <p style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.4 }}>{tier.audience}</p>

      {/* Price */}
      <div style={{ marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: '600' }}>Starting at</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginTop: '0.15rem' }}>
          <span style={{ fontSize: '1.75rem', fontWeight: '800', color: tier.color }}>${price}</span>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>/{cadence === 'annual' ? 'yr' : 'mo'}</span>
        </div>
      </div>

      {/* Per-request and savings callouts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '1.25rem' }}>
        {perReq && (
          <span style={{
            fontSize: '0.72rem',
            color: tier.color,
            fontWeight: '600',
            backgroundColor: `${tier.color}11`,
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            display: 'inline-block',
            alignSelf: 'flex-start',
          }}>
            ~${perReq} per request (annual)
          </span>
        )}
        {!perReq && (
          <span style={{
            fontSize: '0.72rem',
            color: tier.color,
            fontWeight: '600',
            backgroundColor: `${tier.color}11`,
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            display: 'inline-block',
            alignSelf: 'flex-start',
          }}>
            Unlimited requests
          </span>
        )}
        {savingsMsg && (
          <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>{savingsMsg}</span>
        )}
        <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
          {tier.requests ? `${tier.requests} requests included` : 'No request cap'}
        </span>
      </div>

      {/* Features */}
      <ul style={{ margin: '0 0 1.25rem', padding: '0 0 0 0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
        {tier.features.map(f => (
          <li key={f} style={{ display: 'flex', gap: '0.4rem', fontSize: '0.8rem', color: '#374151', lineHeight: 1.4 }}>
            <span style={{ color: '#22c55e', flexShrink: 0, marginTop: '1px' }}>✓</span>
            {f}
          </li>
        ))}
        {tier.notIncluded.map(f => (
          <li key={f} style={{ display: 'flex', gap: '0.4rem', fontSize: '0.8rem', color: '#9ca3af', lineHeight: 1.4 }}>
            <span style={{ flexShrink: 0, marginTop: '1px' }}>–</span>
            {f}
          </li>
        ))}
      </ul>

      <Link href="/requests/new" style={{
        display: 'block',
        textAlign: 'center',
        padding: '0.6rem',
        backgroundColor: tier.highlight ? tier.color : 'white',
        color: tier.highlight ? 'white' : tier.color,
        border: `2px solid ${tier.color}`,
        borderRadius: '7px',
        textDecoration: 'none',
        fontSize: '0.825rem',
        fontWeight: '700',
        marginTop: 'auto',
      }}>
        Get started →
      </Link>
    </div>
  )
}

function HowItWorksItem({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div>
      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{icon}</div>
      <h3 style={{ margin: '0 0 0.35rem', fontSize: '0.875rem', fontWeight: '700', color: '#111827' }}>{title}</h3>
      <p style={{ margin: 0, fontSize: '0.825rem', color: '#6b7280', lineHeight: 1.6 }}>{body}</p>
    </div>
  )
}

function CompRow({
  label, audience, requests, price, perReq, highlight = false,
}: {
  label: string; audience: string; requests: string; price: string; perReq: string; highlight?: boolean
}) {
  return (
    <tr style={{ backgroundColor: highlight ? '#faf5ff' : 'white', borderBottom: '1px solid #f3f4f6' }}>
      <td style={tdStyle}><strong>{label}</strong></td>
      <td style={{ ...tdStyle, color: '#6b7280' }}>{audience}</td>
      <td style={tdStyle}>{requests}</td>
      <td style={tdStyle}>{price}</td>
      <td style={{ ...tdStyle, fontWeight: '700', color: '#111827' }}>{perReq}</td>
    </tr>
  )
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '1rem 1.25rem',
          background: open ? '#f9fafb' : 'white',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#111827',
        }}
      >
        {q}
        <span style={{ fontSize: '1rem', color: '#9ca3af', flexShrink: 0, transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 0.15s' }}>+</span>
      </button>
      {open && (
        <div style={{
          padding: '0 1.25rem 1rem',
          fontSize: '0.875rem',
          color: '#374151',
          lineHeight: 1.7,
          borderTop: '1px solid #f3f4f6',
          paddingTop: '0.75rem',
        }}>
          {children}
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{
      padding: '0.6rem 1rem',
      textAlign: 'left',
      fontSize: '0.75rem',
      fontWeight: '700',
      color: '#6b7280',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      borderBottom: '2px solid #e5e7eb',
    }}>
      {children}
    </th>
  )
}

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  fontSize: '0.875rem',
  color: '#111827',
  verticalAlign: 'middle',
}

function toggleBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '0.4rem 1rem',
    borderRadius: '9999px',
    border: active ? '2px solid #1d4ed8' : '2px solid #e5e7eb',
    backgroundColor: active ? '#eff6ff' : 'white',
    color: active ? '#1d4ed8' : '#6b7280',
    fontWeight: '600',
    fontSize: '0.825rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    transition: 'all 0.15s',
  }
}
