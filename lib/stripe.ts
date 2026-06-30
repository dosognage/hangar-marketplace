/**
 * Stripe server-side client — lazy singleton.
 * Same pattern as lib/supabase-admin.ts: defers initialization until
 * first use so the module can be imported at build time without env vars.
 */
import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('[stripe] Missing env var: STRIPE_SECRET_KEY')
    _stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' })
  }
  return _stripe
}

// Hangar request prices in cents
export const REQUEST_STANDARD_CENTS  = 799    // $7.99
export const REQUEST_PRIORITY_CENTS  = 2999   // $29.99

// Sponsored listing tiers — paid by listing owner to pin to top of browse
export const SPONSOR_TIERS = [
  { days: 7,  cents: 2900,  label: '7 days',  price: '$29' },
  { days: 30, cents: 7900,  label: '30 days', price: '$79' },
  { days: 90, cents: 14900, label: '90 days', price: '$149' },
] as const

export type SponsorTier = typeof SPONSOR_TIERS[number]

// ── Host subscription tiers ──────────────────────────────────────────────
// Recurring monthly subscriptions a host pays for to upgrade ALL their
// listings to Featured / Pro. See host_subscriptions table.
//
// `priceEnvVar` is the env var holding the Stripe Price ID. Set these
// after running scripts/setup-stripe-tier-products.ts the first time.

export type HostTier = 'free' | 'featured' | 'pro'

export interface HostTierSpec {
  id:               HostTier
  label:            string
  cents:            number       // $/month in cents
  priceEnvVar:      string       // env var holding the Stripe Price ID
  listingLimit:     number       // max listings on this tier (Infinity = no cap)
  photoLimit:       number       // max photos per listing (Infinity = no cap)
  badge:            string | null
  searchPriority:   number       // 0 = bottom, higher = boosted to top
  features:         string[]     // pricing-page bullet list
}

export const HOST_TIERS: Record<HostTier, HostTierSpec> = {
  free: {
    id:             'free',
    label:          'Free',
    cents:          0,
    priceEnvVar:    '',
    listingLimit:   1,
    photoLimit:     5,
    badge:          null,
    searchPriority: 0,
    features: [
      '1 listing',
      '5 photos per listing',
      'Public inquiry form',
      'Standard search placement',
    ],
  },
  featured: {
    id:             'featured',
    label:          'Featured',
    cents:          9900,
    priceEnvVar:    'STRIPE_PRICE_FEATURED',
    listingLimit:   5,
    photoLimit:     15,
    badge:          'Featured',
    searchPriority: 1,
    features: [
      'Up to 5 listings',
      '15 photos per listing',
      'Boosted above Free in search',
      'Featured badge on every card',
      'Public inquiry form',
    ],
  },
  pro: {
    id:             'pro',
    label:          'Pro',
    cents:          29900,
    priceEnvVar:    'STRIPE_PRICE_PRO',
    listingLimit:   Number.POSITIVE_INFINITY,
    photoLimit:     Number.POSITIVE_INFINITY,
    badge:          'Pro',
    searchPriority: 2,
    features: [
      'Unlimited listings',
      'Unlimited photos',
      'Top placement above Featured',
      'Pro badge',
      'View + inquiry analytics dashboard',
      'Team accounts',
      'Priority support',
    ],
  },
}

/**
 * Tier sort priority for ORDER BY in listing queries. Stays in sync with
 * the SQL host_tier_priority() function in migration
 * hm_add_host_subscriptions.
 */
export function tierPriority(tier: HostTier | null | undefined): number {
  if (!tier) return 0
  return HOST_TIERS[tier]?.searchPriority ?? 0
}
