/**
 * Broker application end-to-end flow.
 *
 *   1. Logged-in user fills out /apply-broker
 *   2. Admin sees the application in /admin
 *   3. Admin clicks Approve, password modal opens, password verifies
 *   4. Backend sets is_verified=true on broker_profiles, copies contact_email,
 *      sets is_broker=true on user metadata, fires welcome email + notification
 *   5. The user gets a notification and can access /broker/dashboard
 *
 * This test creates an ephemeral applicant per run so we don't pollute the
 * seeded BROKER user. globalTeardown cleans up.
 */

import { test, expect, AUTH_STATES } from '../fixtures/test'
import { getTestSupabaseAdmin } from '../helpers/supabase-admin'
import { ADMIN, ephemeralEmail } from '../helpers/test-users'

// Multi-context flow with two parallel browser contexts (applicant +
// admin), each doing a full login, plus form submits and DB polling.
// On a cold CI runner this easily exceeds the default 30s per-test
// budget. 180s is generous but predictable.
test.describe.configure({ timeout: 180_000 })

test.describe('Broker application: end-to-end', () => {
  test('user applies, admin approves with password reauth, user becomes broker', async ({ browser, page }) => {
    // ── Step 1: spin up an ephemeral applicant ──────────────────────────
    const supabase = getTestSupabaseAdmin()
    const applicantEmail = ephemeralEmail('applicant')
    const applicantPwd   = 'ApplicantPassword123!'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: created, error: createErr } = await (supabase as any).auth.admin.createUser({
      email: applicantEmail,
      password: applicantPwd,
      email_confirm: true,    // skip the email-confirm flow for tests
      user_metadata: { full_name: 'E2E Applicant' },
    })
    expect(createErr, `createUser failed: ${createErr?.message}`).toBeFalsy()
    const applicantId = created.user.id as string

    // ── Step 2: log in as applicant, submit application ──────────────────
    const applicantContext = await browser.newContext()
    const applicantPage = await applicantContext.newPage()
    await applicantPage.goto('/login')
    // Use input[type] selectors — getByLabel(/email/) matches the global
    // newsletter consent checkbox in production builds.
    await applicantPage.locator('input[type="email"]').first().fill(applicantEmail)
    await applicantPage.locator('input[type="password"]').first().fill(applicantPwd)
    // Inject Turnstile bypass token (see LoginPage.fillAndSubmit for full
    // explanation — H1 added the gate, the test secret accepts any token).
    await applicantPage.evaluate(() => {
      let input = document.querySelector('input[name="cf-turnstile-response"]') as HTMLInputElement | null
      if (!input) {
        input = document.createElement('input')
        input.type = 'hidden'
        input.name = 'cf-turnstile-response'
        document.querySelector('form')?.appendChild(input)
      }
      if (!input.value) input.value = 'e2e-bypass-token'
    })
    await applicantPage.getByRole('button', { name: /sign in|log in/i }).click()
    await applicantPage.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 75_000 })

    await applicantPage.goto('/apply-broker')
    // ApplyBrokerForm doesn't link labels to inputs via htmlFor/id, so
    // getByLabel doesn't resolve. Use the actual input names.
    await applicantPage.locator('input[name="full_name"]').fill('E2E Applicant')
    await applicantPage.locator('input[name="brokerage"]').fill('E2E Realty')
    await applicantPage.locator('input[name="license_state"]').fill('CA')
    await applicantPage.locator('input[name="license_number"]').fill('E2E-12345')
    await applicantPage.locator('input[name="phone"]').fill('555-555-1212')
    await applicantPage.locator('input[name="website"]').fill('https://e2e.example.com')
    await applicantPage.locator('textarea[name="bio"]').fill('E2E test applicant.')
    await applicantPage.getByRole('button', { name: /submit application|apply|send application/i }).first().click()

    // The application should now exist in the DB
    await expect.poll(async () => {
      const { data } = await supabase
        .from('broker_applications')
        .select('id, status, email')
        .eq('email', applicantEmail)
        .maybeSingle()
      return data?.status
    }, { timeout: 10_000 }).toBe('pending')

    const { data: app } = await supabase
      .from('broker_applications')
      .select('id, user_id')
      .eq('email', applicantEmail)
      .single()
    const applicationId = app!.id as string

    await applicantContext.close()

    // ── Step 3: admin opens /admin, approves with password reauth ────────
    const adminContext = await browser.newContext({ storageState: AUTH_STATES.admin })
    const adminPage = await adminContext.newPage()
    await adminPage.goto('/admin')

    // Locate the row by application id; if data-attribute isn't present we
    // fall back to clicking by visible email text.
    const row = adminPage.locator(`text=${applicantEmail}`).first()
    await expect(row).toBeVisible({ timeout: 10_000 })

    // Click the Approve button nearest to the row
    const approveBtn = adminPage
      .locator(`xpath=//*[contains(., "${applicantEmail}")]//button[normalize-space()="Approve"]`)
      .first()
    await approveBtn.click()

    // Inline password input should appear
    const pwInput = adminPage.getByPlaceholder(/your password/i)
    await expect(pwInput).toBeVisible()

    // Wrong password → error
    await pwInput.fill('WrongPassword!')
    await adminPage.getByRole('button', { name: /confirm approve/i }).click()
    await expect(adminPage.locator('text=/incorrect password/i').first()).toBeVisible({ timeout: 8_000 })

    // Right password → approves
    await pwInput.fill(ADMIN.password)
    await adminPage.getByRole('button', { name: /confirm approve/i }).click()
    await expect(adminPage.locator('text=/✓ Approved/i').first()).toBeVisible({ timeout: 10_000 })

    await adminContext.close()

    // ── Step 4: verify backend state ─────────────────────────────────────
    await expect.poll(async () => {
      const { data } = await supabase
        .from('broker_profiles')
        .select('is_verified, contact_email')
        .eq('user_id', applicantId)
        .maybeSingle()
      return { v: data?.is_verified, e: data?.contact_email }
    }, { timeout: 10_000 }).toEqual({ v: true, e: applicantEmail })

    const { data: appAfter } = await supabase
      .from('broker_applications')
      .select('status')
      .eq('id', applicationId)
      .single()
    expect(appAfter!.status).toBe('approved')

    // is_broker should be set in user_metadata
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: userAfter } = await (supabase as any).auth.admin.getUserById(applicantId)
    expect(userAfter.user.user_metadata.is_broker).toBe(true)
    expect(userAfter.user.user_metadata.broker_profile_id).toBeTruthy()

    // Notification row created
    const { data: notifs } = await supabase
      .from('notifications')
      .select('type, link')
      .eq('user_id', applicantId)
      .eq('type', 'broker_approved')
    expect(notifs?.length ?? 0).toBeGreaterThan(0)

    // Cleanup the ephemeral applicant (best-effort)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).auth.admin.deleteUser(applicantId).catch(() => undefined)
  })
})
