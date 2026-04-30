/**
 * Stripe webhook handler — deterministic tests.
 *
 * Builds synthetic checkout.session.completed events, signs them with our
 * STRIPE_WEBHOOK_SECRET, and POSTs them at /api/stripe/webhook. Verifies
 * that:
 *   - listing_sponsor events flip is_sponsored + sponsored_until
 *   - listing_fee events flip status from pending_payment → pending
 *   - signature verification rejects unsigned/bad-signature events
 *   - duplicate events are idempotent (no double-extending sponsorship)
 *
 * These don't go through the Stripe UI at all, so they run fast and
 * deterministically in CI without depending on Stripe's hosted Checkout.
 *
 * Tagged @stripe-webhook so they can be run independently:
 *   npx playwright test --grep @stripe-webhook
 */

import { test, expect } from '../fixtures/test'
import { getTestSupabaseAdmin } from '../helpers/supabase-admin'
import { buildCheckoutCompletedEvent, signWebhookPayload } from '../helpers/stripe-webhook'

const webhookConfigured = !!process.env.STRIPE_WEBHOOK_SECRET

test.describe('Stripe webhook handler @stripe-webhook', () => {
  test.skip(!webhookConfigured, 'STRIPE_WEBHOOK_SECRET not configured — skipping')

  test('rejects unsigned events with 400', async ({ request, baseURL }) => {
    const event = buildCheckoutCompletedEvent({ type: 'listing_sponsor', listing_id: 'noop' })
    const res = await request.post(`${baseURL}/api/stripe/webhook`, {
      data: JSON.stringify(event),
      headers: { 'content-type': 'application/json' },
      // intentionally no stripe-signature header
    })
    expect(res.status()).toBe(400)
  })

  test('rejects bad-signature events with 400', async ({ request, baseURL }) => {
    const event = buildCheckoutCompletedEvent({ type: 'listing_sponsor', listing_id: 'noop' })
    const res = await request.post(`${baseURL}/api/stripe/webhook`, {
      data: JSON.stringify(event),
      headers: {
        'content-type':     'application/json',
        'stripe-signature': 't=1234567890,v1=deadbeef',
      },
    })
    expect(res.status()).toBe(400)
  })

  test('listing_sponsor event activates sponsorship + stamps customer id', async ({ request, baseURL }) => {
    const supabase = getTestSupabaseAdmin()

    // Pick (or set up) an unsponsored, approved listing
    const { data: listing } = await supabase
      .from('listings')
      .select('id, is_sponsored')
      .eq('status', 'approved')
      .eq('is_sponsored', false)
      .limit(1)
      .single()
    expect(listing, 'no unsponsored approved listing in test DB').toBeTruthy()

    // Stamp a known starting state so reruns are clean
    await supabase
      .from('listings')
      .update({ is_sponsored: false, sponsored_until: null, stripe_customer_id: null })
      .eq('id', listing!.id)

    const customerId = `cus_test_${Date.now()}`
    const event = buildCheckoutCompletedEvent({
      type:          'listing_sponsor',
      listing_id:    listing!.id,
      duration_days: '30',
      payment_status:'paid',
      customer:      customerId,
    })
    const body = JSON.stringify(event)
    const sig  = signWebhookPayload(body)

    const res = await request.post(`${baseURL}/api/stripe/webhook`, {
      data:    body,
      headers: { 'content-type': 'application/json', 'stripe-signature': sig },
    })
    expect(res.status()).toBe(200)
    expect(await res.json()).toEqual({ received: true })

    // Verify DB state
    const { data: after } = await supabase
      .from('listings')
      .select('is_sponsored, sponsored_until, stripe_customer_id')
      .eq('id', listing!.id)
      .single()
    expect(after?.is_sponsored).toBe(true)
    expect(after?.sponsored_until).not.toBeNull()
    expect(after?.stripe_customer_id).toBe(customerId)

    // sponsored_until should be ~30 days in the future (allow a 5-minute fudge)
    const expectedMs = Date.now() + 30 * 86_400_000
    const actualMs   = new Date(after!.sponsored_until!).getTime()
    expect(Math.abs(actualMs - expectedMs)).toBeLessThan(5 * 60_000)
  })

  test('listing_fee event flips status from pending_payment to pending', async ({ request, baseURL }) => {
    const supabase = getTestSupabaseAdmin()

    // Set up a fresh listing in pending_payment for this test
    const { data: seed } = await supabase
      .from('listings')
      .insert({
        title:          'Webhook test listing — fee path',
        airport_name:   'Centennial',
        airport_code:   'KAPA',
        city:           'Denver',
        state:          'CO',
        property_type:  'hangar',
        listing_type:   'sale',
        ownership_type: 'fee_simple',
        asking_price:   485_000,
        status:         'pending_payment',
        is_sample:      false,
        contact_name:   'E2E Tester',
        contact_email:  'tests@example.com',
        description:    'Created by stripe-webhook-handler.spec.ts',
      })
      .select('id')
      .single()
    expect(seed?.id, 'failed to seed pending_payment listing').toBeTruthy()

    try {
      const event = buildCheckoutCompletedEvent({
        type:           'listing_fee',
        listing_id:     seed!.id,
        payment_status: 'paid',
      })
      const body = JSON.stringify(event)
      const sig  = signWebhookPayload(body)

      const res = await request.post(`${baseURL}/api/stripe/webhook`, {
        data:    body,
        headers: { 'content-type': 'application/json', 'stripe-signature': sig },
      })
      expect(res.status()).toBe(200)

      const { data: after } = await supabase
        .from('listings')
        .select('status, listing_fee_paid')
        .eq('id', seed!.id)
        .single()
      expect(after?.status).toBe('pending')
      expect(after?.listing_fee_paid).toBe(true)
    } finally {
      // Tidy up
      await supabase.from('listings').delete().eq('id', seed!.id)
    }
  })

  test('duplicate listing_sponsor events do not double-extend sponsorship', async ({ request, baseURL }) => {
    // Stripe's at-least-once delivery means we can receive the same event
    // twice. Our handler currently writes-through on each event, but the
    // SAME event ID + same metadata should produce the SAME end state.
    // (This test documents that property — if we add idempotency keys
    // later, the assertion still holds.)
    const supabase = getTestSupabaseAdmin()
    const { data: listing } = await supabase
      .from('listings')
      .select('id')
      .eq('status', 'approved')
      .eq('is_sponsored', false)
      .limit(1)
      .single()
    expect(listing).toBeTruthy()

    await supabase
      .from('listings')
      .update({ is_sponsored: false, sponsored_until: null })
      .eq('id', listing!.id)

    const event = buildCheckoutCompletedEvent({
      type:           'listing_sponsor',
      listing_id:     listing!.id,
      duration_days:  '7',
      payment_status: 'paid',
    })
    const body = JSON.stringify(event)
    const sig  = signWebhookPayload(body)

    // Fire the same event twice
    for (let i = 0; i < 2; i++) {
      const res = await request.post(`${baseURL}/api/stripe/webhook`, {
        data:    body,
        headers: { 'content-type': 'application/json', 'stripe-signature': sig },
      })
      expect(res.status()).toBe(200)
    }

    const { data: after } = await supabase
      .from('listings')
      .select('sponsored_until')
      .eq('id', listing!.id)
      .single()
    // The window should be ~7 days from now, not ~14, because the second
    // write overwrites with the same duration.
    const expectedMs = Date.now() + 7 * 86_400_000
    const actualMs   = new Date(after!.sponsored_until!).getTime()
    expect(Math.abs(actualMs - expectedMs)).toBeLessThan(5 * 60_000)
  })
})
