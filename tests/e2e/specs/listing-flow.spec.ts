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

test.describe('Listing submission @listings', () => {
  test('contact info is prefilled from user profile', async ({ submitListingPage }) => {
    await submitListingPage.goto()
    await expect(submitListingPage.contactEmail).toHaveValue(USER.email)
    await expect(submitListingPage.contactName).not.toHaveValue('')
  })

  test('submit a basic listing → enters pending state', async ({ submitListingPage, page }) => {
    const supabase = getTestSupabaseAdmin()
    const uniqueTitle = `E2E Listing ${Date.now()}`

    await submitListingPage.goto()
    await submitListingPage.title.fill(uniqueTitle)
    await submitListingPage.airportCode.fill('KZZE')
    await submitListingPage.askingPrice.fill('125000')
    await submitListingPage.description.fill('E2E test listing — safe to delete.')
    await submitListingPage.publishButton.click()

    // After publish, the form redirects to /submit/success or /dashboard
    await page.waitForURL(/\/submit\/success|\/dashboard|\/listing\//, { timeout: 15_000 })

    // Listing should exist in pending state
    await expect.poll(async () => {
      const { data } = await supabase
        .from('listings')
        .select('status')
        .eq('title', uniqueTitle)
        .maybeSingle()
      return data?.status
    }, { timeout: 10_000 }).toBe('pending')

    // Cleanup
    await supabase.from('listings').delete().eq('title', uniqueTitle)
  })
})
