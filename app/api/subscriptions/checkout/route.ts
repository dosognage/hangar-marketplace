/**
 * POST /api/subscriptions/checkout
 *
 * Starts a Stripe Checkout Session in subscription mode for the
 * authenticated host. Returns a checkout URL the client redirects to.
 *
 * Body: { tier: 'featured' | 'pro' }
 *
 * On success:
 *  - Stripe Checkout collects the card
 *  - On confirmation, Stripe fires checkout.session.completed with
 *    metadata.type='host_subscription' which the webhook
 *    (app/api/stripe/webhook/route.ts) handles to create / update the
 *    host_subscriptions row.
 *
 * Customer reuse: if the host already has a stripe_customer_id from a
 * prior subscription or one-time purchase, we hand it back to Stripe so
 * the new subscription attaches to the same Customer (one Customer per
 * host across the platform's lifetime).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStripe, HOST_TIERS, type HostTier } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createServerClient } from '@/lib/supabase-server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'

export async function POST(req: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'You must be signed in to subscribe.' }, { status: 401 })
  }

  // ── Parse + validate body ──────────────────────────────────────────
  let body: { tier?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  const tier = body.tier as HostTier | undefined
  if (!tier || tier === 'free' || !HOST_TIERS[tier]) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
  }

  const spec  = HOST_TIERS[tier]
  const priceId = process.env[spec.priceEnvVar]
  if (!priceId) {
    console.error(`[checkout] Missing ${spec.priceEnvVar} env var — run scripts/setup-stripe-tier-products.mjs`)
    return NextResponse.json({ error: 'Tier not yet configured. Contact support.' }, { status: 500 })
  }

  // ── Stripe Customer reuse ──────────────────────────────────────────
  // Look up any existing customer ID we've stored for this user — either
  // from a prior subscription or a sponsorship purchase.
  const { data: existing } = await supabaseAdmin
    .from('host_subscriptions')
    .select('stripe_customer_id, stripe_subscription_id, tier, status')
    .eq('user_id', user.id)
    .maybeSingle()

  // If they already have an active subscription, send them through the
  // Customer Portal to upgrade/downgrade instead of starting a fresh one.
  if (existing?.stripe_subscription_id && existing.status === 'active') {
    return NextResponse.json({
      error:        'You already have an active subscription. Use Manage Subscription to change tiers.',
      portalNeeded: true,
    }, { status: 409 })
  }

  // ── Create Checkout Session ────────────────────────────────────────
  const stripe = getStripe()
  let session
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      ...(existing?.stripe_customer_id
        ? { customer: existing.stripe_customer_id }
        : { customer_email: user.email }),
      success_url: `${SITE_URL}/host/billing?success=1`,
      cancel_url:  `${SITE_URL}/host/billing?cancelled=1`,
      metadata: {
        type:    'host_subscription',
        user_id: user.id,
        tier,
      },
      subscription_data: {
        // Mirror metadata onto the subscription itself so subscription.*
        // webhook events carry the same context.
        metadata: { user_id: user.id, tier },
      },
    })
  } catch (err) {
    console.error('[checkout] Stripe error:', err)
    return NextResponse.json({ error: 'Could not start checkout. Try again.' }, { status: 500 })
  }

  return NextResponse.json({ url: session.url })
}
