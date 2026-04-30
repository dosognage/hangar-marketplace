/**
 * Stripe webhook signature helper.
 *
 * Lets tests POST synthetic Stripe events at /api/stripe/webhook with a
 * valid signature header so the handler accepts them. We sign the body
 * with the same STRIPE_WEBHOOK_SECRET the handler uses to verify it.
 *
 * Why not use the Stripe CLI? `stripe trigger` works but introduces an
 * external dependency in CI and produces nondeterministic event payloads
 * (random IDs, different metadata each run). Hand-rolled signing gives us
 * deterministic, fast, fully-controlled tests of our own webhook code.
 */

import Stripe from 'stripe'

type CheckoutSessionLike = {
  id?:                string
  type:               'listing_sponsor' | 'listing_fee' | 'hangar_request'
  listing_id?:        string
  request_id?:        string
  duration_days?:     string
  is_priority?:       string
  payment_status?:    'paid' | 'unpaid'
  customer?:          string | null
}

/**
 * Build a payload that mirrors the shape Stripe sends for
 * checkout.session.completed events, with our app's metadata fields.
 */
export function buildCheckoutCompletedEvent(input: CheckoutSessionLike) {
  const sessionId = input.id ?? `cs_test_${Math.random().toString(36).slice(2, 10)}`
  const eventId   = `evt_test_${Math.random().toString(36).slice(2, 10)}`
  const created   = Math.floor(Date.now() / 1000)

  return {
    id:        eventId,
    object:    'event',
    api_version: '2024-12-18',
    created,
    livemode:  false,
    type:      'checkout.session.completed',
    data: {
      object: {
        id:             sessionId,
        object:         'checkout.session',
        payment_status: input.payment_status ?? 'paid',
        customer:       input.customer ?? null,
        metadata: {
          ...(input.type ? { type: input.type } : {}),
          ...(input.listing_id    ? { listing_id:    input.listing_id    } : {}),
          ...(input.request_id    ? { request_id:    input.request_id    } : {}),
          ...(input.duration_days ? { duration_days: input.duration_days } : {}),
          ...(input.is_priority   ? { is_priority:   input.is_priority   } : {}),
        },
      },
    },
  }
}

/**
 * Sign an event body with STRIPE_WEBHOOK_SECRET so it passes
 * stripe.webhooks.constructEvent() in our handler.
 */
export function signWebhookPayload(body: string): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error(
      '[tests/stripe-webhook] STRIPE_WEBHOOK_SECRET not set. Tests need ' +
      'the same webhook signing secret the server uses (whsec_test_... ' +
      'from Stripe dashboard, or any constant for local).',
    )
  }

  // Stripe's official helper takes a payload + secret + timestamp and
  // returns the t=...,v1=... string the handler expects.
  return Stripe.webhooks.generateTestHeaderString({
    payload:   body,
    secret,
    timestamp: Math.floor(Date.now() / 1000),
  })
}
