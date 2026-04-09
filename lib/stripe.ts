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
