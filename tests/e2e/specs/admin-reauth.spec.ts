/**
 * Admin password re-auth — covers comp-sponsor on hangar listings + airport
 * homes. The PasswordPromptModal component should open on click of any
 * "Comp Xd" or "Extend Xd" button and refuse to proceed without a correct
 * password.
 */

import { test, expect, AUTH_STATES } from '../fixtures/test'
import { getTestSupabaseAdmin } from '../helpers/supabase-admin'
import { ADMIN, USER } from '../helpers/test-users'

test.use({ storageState: AUTH_STATES.admin })

test.describe('Admin comp-sponsor flow with password modal', () => {
  // Reset all seeded listings to is_sponsored=false before each test. The
  // admin UI swaps the button label from "Comp ${days}d" to "Extend ${days}d"
  // once a listing is sponsored, which would break the second test if the
  // first one already comp'd. Clean state per-test = predictable selectors.
  test.beforeEach(async () => {
    const supabase = getTestSupabaseAdmin()
    await supabase
      .from('listings')
      .update({ is_sponsored: false, sponsored_until: null })
      .eq('contact_email', USER.email)
  })

  test.beforeAll(async () => {
    // Ensure at least one approved listing exists for us to comp.
    const supabase = getTestSupabaseAdmin()
    const { data: existing } = await supabase
      .from('listings')
      .select('id')
      .eq('status', 'approved')
      .eq('contact_email', USER.email)
      .limit(1)
      .maybeSingle()
    if (existing) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: u } = await (supabase as any).auth.admin.listUsers({ perPage: 1000 })
    const seedUser = (u?.users ?? []).find((x: { email?: string }) => x.email === USER.email)
    if (!seedUser) throw new Error('seeded USER not found in test branch')

    await supabase.from('listings').insert({
      title:           'E2E Test Hangar',
      airport_name:    'Test Field',
      airport_code:    'KZZE',
      city:            'Testville',
      state:           'CA',
      listing_type:    'sale',
      ownership_type:  'owned',
      asking_price:    100_000,
      square_feet:     2_000,
      status:          'approved',
      is_sample:       false,
      is_sponsored:    false,
      contact_name:    'E2E User',
      contact_email:   USER.email,
      contact_phone:   '555-0100',
      user_id:         seedUser.id,
      description:     'Seeded by admin-reauth tests.',
    })
  })

  test('comp-sponsor opens password modal, rejects wrong password', async ({ adminPage, page }) => {
    await adminPage.goto()

    // Navigate to the Listings tab if there's tab UI; otherwise scroll to first
    // listing card. The Comp 30d button should be visible.
    const compButton = adminPage.compButton(30)
    await compButton.first().scrollIntoViewIfNeeded()
    await compButton.first().click()

    // Modal opens
    await expect(adminPage.passwordModal).toBeVisible({ timeout: 8_000 })

    // Wrong password → error inline, modal stays open
    await adminPage.passwordModalInput.fill('this-is-wrong')
    await adminPage.passwordModalConfirm.click()
    await expect(adminPage.passwordModalError).toContainText(/incorrect password/i, { timeout: 8_000 })
    await expect(adminPage.passwordModal).toBeVisible()

    // Cancel closes modal cleanly
    await adminPage.passwordModalCancel.click()
    await expect(adminPage.passwordModal).not.toBeVisible({ timeout: 4_000 })
  })

  test('correct password performs the comp and updates sponsored_until', async ({ adminPage }) => {
    const supabase = getTestSupabaseAdmin()
    const { data: candidate } = await supabase
      .from('listings')
      .select('id, sponsored_until, is_sponsored')
      .eq('status', 'approved')
      .eq('contact_email', USER.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    expect(candidate, 'no listing to comp').toBeTruthy()
    const before = candidate!.sponsored_until

    await adminPage.goto()
    // The admin UI renders ONE Comp button per listing whose label reflects
    // the current dropdown selection (default 30). To click "Comp 7d" we
    // first need to set the duration dropdown to 7. Scope to the first
    // listing card to avoid matching multiple selects.
    const firstCard = adminPage.page.locator('select').filter({ hasText: '7 days' }).first()
    await firstCard.scrollIntoViewIfNeeded()
    await firstCard.selectOption({ value: '7' })
    const btn = adminPage.compButton(7).first()
    await btn.scrollIntoViewIfNeeded()
    await btn.click()

    await expect(adminPage.passwordModal).toBeVisible({ timeout: 8_000 })
    await adminPage.passwordModalInput.fill(ADMIN.password)
    await adminPage.passwordModalConfirm.click()

    // Modal closes on success
    await expect(adminPage.passwordModal).not.toBeVisible({ timeout: 10_000 })

    // sponsored_until should have moved forward
    await expect.poll(async () => {
      const { data } = await supabase
        .from('listings')
        .select('sponsored_until, is_sponsored')
        .eq('id', candidate!.id)
        .single()
      return data?.is_sponsored === true && data?.sponsored_until !== before
    }, { timeout: 10_000, message: 'sponsored_until did not change after comp' }).toBe(true)
  })
})
