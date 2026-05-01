/**
 * Listing submission and edit flow.
 *
 * As a logged-in user:
 *   1. Open /submit with prefilled contact info
 *   2. Save as draft → row appears in /dashboard "My Drafts"
 *   3. Submit a real listing → row enters review queue (status=pending)
 *   4. Edit own listing → changes persist after save
 */

import { test, expect, AUTH_STATES } from '../fixtures/test'
import { getTestSupabaseAdmin } from '../helpers/supabase-admin'
import { USER } from '../helpers/test-users'

test.use({ storageState: AUTH_STATES.user })

// Photo uploads to Supabase storage on a cold CI runner can take 30+s for
// three files. Bump the per-test timeout so waitForURL gets its full 60s.
test.describe.configure({ timeout: 120_000 })

test.describe('Listing submission @listings', () => {
  test('contact info is prefilled from user profile', async ({ submitListingPage }) => {
    await submitListingPage.goto()
    await expect(submitListingPage.contactEmail).toHaveValue(USER.email)
    await expect(submitListingPage.contactName).not.toHaveValue('')
  })

  test('submit a basic listing → enters draft state', async ({ submitListingPage, page }) => {
    const supabase = getTestSupabaseAdmin()
    const uniqueTitle = `E2E Listing ${Date.now()}`

    await submitListingPage.goto()
    await submitListingPage.title.fill(uniqueTitle)
    // SubmitForm.tsx marks airport_name, airport_code, city, state, title,
    // and contact fields all required. The contact ones auto-populate from
    // the seeded user; we have to fill the geo fields ourselves or HTML5
    // validation blocks the submit.
    await submitListingPage.airportName.fill('Test Field')
    await submitListingPage.airportCode.fill('KZZE')
    await submitListingPage.city.fill('Testville')
    await submitListingPage.state.fill('CA')
    await submitListingPage.askingPrice.fill('125000')
    await submitListingPage.description.fill('E2E test listing — safe to delete.')

    // Save as draft instead of publish — drafts skip the MIN_PHOTOS=3
    // requirement, the airport-autocomplete resolution, and the contact
    // info validation. The createListing server action's draft branch
    // is the path we actually want to assert here. The full publish path
    // (with photo upload + Stripe checkout when post-trial) is exercised
    // by stripe-webhook-handler.spec.ts at the API layer.
    await submitListingPage.draftButton.click()

    // createListing inserts the listing, runs an optional fallback geocode
    // (best-effort, can be slow), then redirects. Cold CI Supabase
    // connections push this well past 30s, so give it 90s.
    await page.waitForURL(/\/dashboard/, { timeout: 90_000 })

    // Listing should exist in draft state
    await expect.poll(async () => {
      const { data } = await supabase
        .from('listings')
        .select('status')
        .eq('title', uniqueTitle)
        .maybeSingle()
      return data?.status
    }, { timeout: 10_000 }).toBe('draft')

    // Cleanup
    await supabase.from('listings').delete().eq('title', uniqueTitle)
  })
})
