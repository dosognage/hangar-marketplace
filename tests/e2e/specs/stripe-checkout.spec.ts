/**
 * Stripe sponsor checkout (test mode).
 *
 * Exercises the full sponsorship purchase:
 *   1. User clicks "Sponsor this listing" on a listing detail page
 *   2. Server creates a Checkout Session and redirects to checkout.stripe.com
 *   3. The test reads that Session back from the Stripe API and checks the
 *      price, mode and metadata our webhook depends on
 *   4. A signed checkout.session.completed webhook for that Session updates
 *      is_sponsored + sponsored_until in the DB
 *
 * The test deliberately does NOT type into Stripe's hosted payment form.
 * That form is Stripe's UI, not ours, and Stripe reshapes it without notice:
 * Link added required Email/ZIP/phone fields in 2025, and in November 2026
 * the whole form moved into a cross-origin iframe ("Secure embedded form
 * frame"), which broke the old page-level selectors on every retry. Card
 * entry is Stripe's code path; everything our code controls (session
 * creation, metadata, webhook handling) is still covered end to end.
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
import { USER } from '../helpers/test-users'
import { getStripe, SPONSOR_TIERS } from '../../../lib/stripe'
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
    // listUsers() defaults to 50 per page and returns newest-first, so a
    // buildup of ephemeral applicant users from broker-flow.spec can
    // push the seeded USER off page 1 and .find() returns undefined.
    // Ask for a larger page (Supabase max is 200) so the seed reliably
    // shows up even if leak cleanup drifts.
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 200 })
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

    // Read the Session the server just created straight from Stripe and
    // check what the webhook relies on. The test runner and the dev server
    // share the same STRIPE_SECRET_KEY (a sk_test_ key), so the Session is
    // visible here.
    const sessionId = page.url().match(/cs_test_[A-Za-z0-9]+/)?.[0]
    expect(sessionId, `no cs_test_ id in checkout URL ${page.url()}`).toBeTruthy()

    const stripe  = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId!)
    const tier    = SPONSOR_TIERS.find(t => t.days === 7)!

    expect(session.mode).toBe('payment')
    expect(session.status).toBe('open')
    expect(session.currency).toBe('usd')
    expect(session.amount_total).toBe(tier.cents)
    expect(session.metadata).toMatchObject({
      type:          'listing_sponsor',
      listing_id:    listing!.id,
      duration_days: '7',
    })
    expect(session.success_url).toContain(`/listing/${listing!.id}`)

    // Nobody will pay this Session; expire it so it does not sit open in the
    // Stripe test dashboard for 24 hours.
    await stripe.checkout.sessions.expire(sessionId!)

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
      id:             sessionId!,
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
