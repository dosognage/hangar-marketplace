/**
 * Stripe sponsor checkout (test mode).
 *
 * Exercises the full sponsorship purchase:
 *   1. User clicks "Sponsor this listing" on a listing detail page
 *   2. Server creates a Checkout Session and redirects
 *   3. Test card 4242 4242 4242 4242 completes payment
 *   4. Stripe webhook fires → DB updates is_sponsored + sponsored_until
 *   5. Stripe customer portal can cancel the sponsorship
 *
 * Setup needed:
 *   - STRIPE_SECRET_KEY in .env.test must be a TEST key (sk_test_...)
 *   - STRIPE_WEBHOOK_SECRET set to a TEST webhook signing secret
 *   - Webhook endpoint configured in Stripe dashboard pointing at the
 *     PLAYWRIGHT_BASE_URL/api/stripe/webhook (or use Stripe CLI for local)
 *
 * @stripe — these tests are tagged so they can be skipped in environments
 * that don't have Stripe test mode wired up. Run with:
 *   npx playwright test --grep @stripe
 */

import { test, expect, AUTH_STATES } from '../fixtures/test'
import { getTestSupabaseAdmin } from '../helpers/supabase-admin'
import { STRIPE_TEST_CARDS } from '../helpers/stripe-cards'

test.use({ storageState: AUTH_STATES.user })

const stripeConfigured = !!process.env.STRIPE_SECRET_KEY
                       && process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')

test.describe('Stripe sponsor checkout @stripe', () => {
  test.skip(!stripeConfigured, 'STRIPE_SECRET_KEY not configured for test mode — skipping')

  test('sponsor checkout completes and webhook updates DB', async ({ page }) => {
    const supabase = getTestSupabaseAdmin()
    // Find a sponsorable listing (approved + not already sponsored)
    const { data: listing } = await supabase
      .from('listings')
      .select('id, title')
      .eq('status', 'approved')
      .eq('is_sponsored', false)
      .limit(1)
      .single()
    expect(listing, 'no sponsorable listing found in test DB').toBeTruthy()

    await page.goto(`/listing/${listing!.id}`)
    await page.getByRole('button', { name: /sponsor|boost|feature this listing/i }).first().click()

    // Pick the cheapest tier and proceed to Stripe Checkout
    await page.getByRole('button', { name: /7[- ]day|\$29/i }).first().click()
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15_000 })

    // Stripe-hosted checkout is in an iframe-free page now. Fill the test card.
    const card = STRIPE_TEST_CARDS.visaSuccess
    await page.locator('#cardNumber, [name="cardNumber"]').fill(card.number.replace(/\s/g, ''))
    await page.locator('#cardExpiry, [name="cardExpiry"]').fill(card.exp.replace(/\s/g, ''))
    await page.locator('#cardCvc,    [name="cardCvc"]').fill(card.cvc)
    // Cardholder name is required even in test mode
    await page.locator('#billingName, [name="billingName"]').fill('E2E Tester')
    // Submit — Stripe redirects back to our success URL
    await page.getByRole('button', { name: /pay|subscribe|complete/i }).click()

    // Land back on /listing/[id]?status=success or similar
    await page.waitForURL(/hangarmarketplace|localhost/, { timeout: 30_000 })

    // Webhook will arrive asynchronously. Poll until DB reflects it.
    await expect.poll(async () => {
      const { data } = await supabase
        .from('listings')
        .select('is_sponsored, sponsored_until')
        .eq('id', listing!.id)
        .single()
      return data?.is_sponsored === true && data?.sponsored_until !== null
    }, {
      timeout: 60_000,
      intervals: [1_000, 2_000, 5_000],
      message: 'Stripe webhook did not update sponsored_until within 60s. Check ' +
               'STRIPE_WEBHOOK_SECRET and the Stripe webhook endpoint config.',
    }).toBe(true)
  })
})
