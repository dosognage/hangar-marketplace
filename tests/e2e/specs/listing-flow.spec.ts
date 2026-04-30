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

    // Publish path requires at least 3 photos (MIN_PHOTOS in SubmitForm).
    // Upload three tiny synthetic JPEGs via Playwright's setInputFiles —
    // we don't need real images, just valid file uploads of the right
    // content type so the photo uploader and Supabase storage accept them.
    const tinyJpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
      0xff, 0xdb, 0x00, 0x43, 0x00, 0x08,
      ...new Array(63).fill(0x10),
      0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00,
      0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ...new Array(8).fill(0x00),
      0xff, 0xc4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ...new Array(8).fill(0x00),
      0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x00,
      0xff, 0xd9,
    ])
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles([
      { name: 'p1.jpg', mimeType: 'image/jpeg', buffer: tinyJpeg },
      { name: 'p2.jpg', mimeType: 'image/jpeg', buffer: tinyJpeg },
      { name: 'p3.jpg', mimeType: 'image/jpeg', buffer: tinyJpeg },
    ])

    await submitListingPage.publishButton.click()

    // After publish, the form redirects to /submit/success or /dashboard.
    // Photo uploads to Supabase storage can take a few seconds — bump the
    // timeout to accommodate.
    await page.waitForURL(/\/submit\/success|\/dashboard|\/listing\//, { timeout: 60_000 })

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
