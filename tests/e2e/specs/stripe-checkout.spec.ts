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
import { USER } from '../helpers/test-users'
import { buildCheckoutCompletedEvent, signWebhookPayload } from '../helpers/stripe-webhook'

test.use({ storageState: AUTH_STATES.user })

const stripeConfigured = !!process.env.STRIPE_SECRET_KEY
                       && process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')

test.describe('Stripe sponsor checkout @stripe', () => {
  test.skip(!stripeConfigured, 'STRIPE_SECRET_KEY not configured for test mode — skipping')

  test('sponsor checkout completes and webhook updates DB', async ({ page }) => {
    // Seed a listing OWNED by USER so the C1 ownership check passes —
    // pre-C1 this test picked any approved listing, which now correctly
    // 403s because the caller doesn't own it.
    const supabase = getTestSupabaseAdmin()
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const userRow = users.find(u => u.email === USER.email)
    expect(userRow, `seeded test user ${USER.email} not found`).toBeTruthy()

    const { data: listing, error: seedError } = await supabase
      .from('listings')
      .insert({
        title:          'Sponsor checkout test listing',
        airport_name:   'Centennial',
        airport_code:   'KAPA',
        city:           'Denver',
        state:          'CO',
        property_type:  'hangar',
        listing_type:   'sale',
        ownership_type: 'fee_simple',
        asking_price:   100_000,
        status:         'approved',
        is_sponsored:   false,
        is_sample:      false,
        contact_name:   'E2E Tester',
        contact_email:  'tests@example.com',
        description:    'created by stripe-checkout.spec.ts',
        user_id:        userRow!.id,
      })
      .select('id, title')
      .single()
    if (seedError) throw seedError
    expect(listing, 'failed to seed listing').toBeTruthy()

    await page.goto(`/listing/${listing!.id}`)
    await page.getByRole('button', { name: /sponsor|boost|feature this listing/i }).first().click()

    // SponsorButton's expanded picker has TWO clickable layers:
    //   1. Tier select buttons (`sponsor-tier-7`, `-30`, `-90`) — toggle
    //      `selectedDays` state but never navigate.
    //   2. The "Sponsor for X days ($Y)" confirm button
    //      (`sponsor-checkout-confirm`) — calls the API and redirects.
    // A loose name-based regex matches both, and Playwright's `.first()`
    // picked the wrong one (the tier toggle) which silently no-op'd the
    // navigation. Use data-testid anchors so the test exercises the actual
    // flow: select the 7-day tier, THEN click the confirm CTA.
    await page.getByTestId('sponsor-tier-7').click()
    await page.getByTestId('sponsor-checkout-confirm').click()
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15_000 })

    // Stripe-hosted checkout (the iframe-free flavour).
    //
    // The page evolved significantly when Stripe rolled Link in: there's now
    // a "Contact information" section above payment that requires Email,
    // multiple payment-method accordions (Card / Bank / Klarna) with Card
    // expanded by default, the billing block demands ZIP on top of name +
    // country, and a "Save my information for faster checkout" checkbox is
    // pre-checked which makes Phone required for the Link save path.
    //
    // The form's submit button stays in `SubmitButton--incomplete` state
    // (CSS class — visibly greyed out, technically still clickable but a
    // no-op) until ALL these inputs are valid. Fill them in order:
    const card = STRIPE_TEST_CARDS.visaSuccess

    // Contact information — Email (top of form)
    await page.getByRole('textbox', { name: /^email$/i })
              .fill('e2e-test@hangarmarketplace.com')

    // Card details (the Card accordion is the default-checked payment method)
    await page.locator('#cardNumber, [name="cardNumber"]').fill(card.number.replace(/\s/g, ''))
    await page.locator('#cardExpiry, [name="cardExpiry"]').fill(card.exp.replace(/\s/g, ''))
    await page.locator('#cardCvc,    [name="cardCvc"]').fill(card.cvc)

    // Billing block — cardholder name + ZIP (country defaults to US)
    await page.locator('#billingName, [name="billingName"]').fill('E2E Tester')
    await page.getByRole('textbox', { name: /^zip$/i }).fill('80014')

    // Disable the Link "Save my info" flow so we don't have to satisfy its
    // phone-number requirement. This is a TEST-only convenience — real users
    // benefit from Link, but the spec is scoped to the plain-card path.
    await page.getByRole('checkbox', { name: /save my information/i }).uncheck()

    // Submit. Stripe's hosted checkout exposes a stable data-testid on the
    // submit CTA — we use it directly rather than role+name regex because
    // the page now contains multiple "Pay with X" accordion buttons (Card,
    // Bank, Klarna, Link) that match any loose `name: /pay/i` and trip
    // Playwright strict-mode violations.
    await page.getByTestId('hosted-payment-submit-button').click()

    // Land back on /listing/[id]?status=success or similar
    await page.waitForURL(/hangarmarketplace|localhost/, { timeout: 30_000 })

    // Stripe's real checkout.session.completed webhook can't reach the dev
    // server (Stripe → localhost isn't a path) so we fire a synthetic
    // signed event ourselves. The handler is the same code real-Stripe
    // would hit, the signature is computed with the SAME secret it
    // verifies against, and the metadata mirrors what /api/stripe/
    // sponsor-checkout set on the real Session — so this exercises the
    // full handler logic deterministically without depending on outbound
    // reachability to a tunnel. (See helpers/stripe-webhook.ts for the
    // rationale; stripe-webhook-handler.spec.ts owns the deeper handler
    // contract tests.)
    const event = buildCheckoutCompletedEvent({
      type:           'listing_sponsor',
      listing_id:     listing!.id,
      duration_days:  '7',
      payment_status: 'paid',
    })
    const body      = JSON.stringify(event)
    const signature = signWebhookPayload(body)
    const baseUrl   = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
    const webhookRes = await page.request.post(`${baseUrl}/api/stripe/webhook`, {
      headers: {
        'stripe-signature': signature,
        'content-type':     'application/json',
      },
      data: body,
    })
    expect(
      webhookRes.ok(),
      `webhook handler returned ${webhookRes.status()} ${webhookRes.statusText()}`,
    ).toBe(true)

    // The handler updates the DB synchronously before responding, so a
    // tight poll converges in 1-2 iterations.
    await expect.poll(async () => {
      const { data } = await supabase
        .from('listings')
        .select('is_sponsored, sponsored_until')
        .eq('id', listing!.id)
        .single()
      return data?.is_sponsored === true && data?.sponsored_until !== null
    }, {
      timeout:   10_000,
      intervals: [500, 1_000, 2_000],
      message:   'sponsored_until did not get set after the synthetic webhook ' +
                 'POST returned 2xx. Inspect app/api/stripe/webhook/route.ts.',
    }).toBe(true)

    // Cleanup the seeded listing.
    await supabase.from('listings').delete().eq('id', listing!.id)
  })
})
