/**
 * Stripe checkout API endpoints — integration tests.
 *
 * Verifies the server-side endpoints that produce Checkout Session URLs
 * actually return valid Stripe URLs. Doesn't go through the hosted UI
 * (the brittle part), but does exercise the full Next.js route + Stripe
 * SDK + DB read path.
 *
 * Tagged @stripe-api so they can be skipped when the test environment
 * doesn't have a Stripe test key configured:
 *   npx playwright test --grep @stripe-api
 */

import { test, expect, AUTH_STATES } from '../fixtures/test'
import { getTestSupabaseAdmin } from '../helpers/supabase-admin'

const stripeConfigured = !!process.env.STRIPE_SECRET_KEY
                       && process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')

test.use({ storageState: AUTH_STATES.user })

test.describe('Stripe checkout API @stripe-api', () => {
  test.skip(!stripeConfigured, 'STRIPE_SECRET_KEY (sk_test_) not configured — skipping')

  test('sponsor-checkout returns a valid Stripe Checkout URL', async ({ request, baseURL }) => {
    const supabase = getTestSupabaseAdmin()
    const { data: listing } = await supabase
      .from('listings')
      .select('id')
      .eq('status', 'approved')
      .eq('is_sample', false)
      .limit(1)
      .single()
    expect(listing, 'no approved listing in test DB').toBeTruthy()

    const res = await request.post(`${baseURL}/api/stripe/sponsor-checkout`, {
      data: { listing_id: listing!.id, duration_days: 7 },
      headers: { 'content-type': 'application/json' },
    })

    expect(res.ok(), `sponsor-checkout returned ${res.status()}: ${await res.text()}`).toBe(true)
    const body = await res.json()
    expect(body.url, 'no Stripe URL in response').toBeTruthy()
    expect(body.url).toMatch(/^https:\/\/checkout\.stripe\.com\//)
  })

  test('sponsor-checkout rejects unknown listing_id with 404', async ({ request, baseURL }) => {
    const fakeId = '00000000-0000-0000-0000-000000000000'
    const res = await request.post(`${baseURL}/api/stripe/sponsor-checkout`, {
      data: { listing_id: fakeId, duration_days: 7 },
      headers: { 'content-type': 'application/json' },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })

  test('portal endpoint refuses listings with no stripe_customer_id', async ({ request, baseURL }) => {
    // A freshly-created listing has no stripe_customer_id yet — the portal
    // endpoint should refuse rather than creating a new portal session.
    const supabase = getTestSupabaseAdmin()
    const { data: seed } = await supabase
      .from('listings')
      .insert({
        title:          'Portal test listing',
        airport_name:   'Centennial',
        airport_code:   'KAPA',
        city:           'Denver',
        state:          'CO',
        property_type:  'hangar',
        listing_type:   'sale',
        ownership_type: 'fee_simple',
        asking_price:   100_000,
        status:         'approved',
        is_sample:      false,
        contact_name:   'E2E Tester',
        contact_email:  'tests@example.com',
        description:    'created by stripe-checkout-api.spec.ts',
      })
      .select('id')
      .single()
    expect(seed?.id).toBeTruthy()

    try {
      const res = await request.post(`${baseURL}/api/stripe/portal`, {
        data: { listing_id: seed!.id },
        headers: { 'content-type': 'application/json' },
      })
      // Either 4xx error or 200 with an error in the body — either is
      // acceptable so long as we DON'T accidentally redirect to a portal
      // for a listing with no associated customer.
      if (res.ok()) {
        const body = await res.json()
        expect(body.url, 'portal returned a URL for a listing with no customer').toBeFalsy()
        expect(body.error).toBeTruthy()
      } else {
        expect(res.status()).toBeGreaterThanOrEqual(400)
      }
    } finally {
      await supabase.from('listings').delete().eq('id', seed!.id)
    }
  })
})
