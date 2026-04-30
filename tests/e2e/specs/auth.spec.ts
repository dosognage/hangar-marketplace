/**
 * Auth flows — signup, login, logout, forgot password, login alerts.
 *
 * These specs exercise the actual server actions and verify state in
 * Supabase via the service-role admin client. They use ephemeral users
 * (one-off email addresses) and are cleaned up by globalTeardown.
 */

import { test, expect } from '../fixtures/test'
import { getTestSupabaseAdmin } from '../helpers/supabase-admin'
import { ephemeralEmail, USER } from '../helpers/test-users'

// Signup + forgot-password forms are gated by Turnstile, which doesn't
// load reliably from GitHub Actions runners. Skip those describe blocks
// in CI; the underlying server actions are exercised by other specs.
const skipTurnstileInCI = !!process.env.CI

test.describe('Signup flow', () => {
  test.skip(skipTurnstileInCI, 'Turnstile widget does not load on GitHub Actions runners.')
  test('happy path: new user can sign up via Turnstile-protected form', async ({ signupPage, page }) => {
    const email = ephemeralEmail('signup')
    const password = 'TestPassword123!'

    await signupPage.goto()
    await signupPage.waitForTurnstileReady()
    await signupPage.fillForm({ name: 'Signup Test', email, password, marketing: true })
    await signupPage.submit.click()

    // Supabase requires email confirmation, so we land on /signup/confirm
    await page.waitForURL(/\/signup\/confirm/, { timeout: 15_000 })
    await expect(page.getByRole('heading')).toContainText(/check your (?:inbox|email)|confirm/i)

    // Verify the user exists in auth — they're created with confirmed=false
    const supabase = getTestSupabaseAdmin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).auth.admin.listUsers({ perPage: 1000 })
    const created = (data?.users ?? []).find((u: { email?: string }) => u.email === email)
    expect(created, `Signup did not create auth user for ${email}`).toBeTruthy()
  })

  test('rejects without Turnstile token (server-side gate)', async ({ page }) => {
    // Submit the form via direct POST without going through the widget. This
    // simulates a bot bypassing the JS layer. Server action should reject.
    const response = await page.request.post('/signup', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data:    'name=Bot&email=bot@example.com&password=botpwd1234&confirmPassword=botpwd1234',
    })
    // Server action with no cf-turnstile-response should fall through to the
    // captcha error (returned as state). We can't assert the exact JSON shape
    // (Server Actions use RSC payload), but the request should NOT land us
    // at /signup/confirm.
    expect(response.url()).not.toMatch(/\/signup\/confirm/)
  })

  test('password mismatch shows error', async ({ signupPage, page }) => {
    await signupPage.goto()
    await signupPage.waitForTurnstileReady()
    await signupPage.name.fill('Mismatch Test')
    await signupPage.email.fill(ephemeralEmail('mismatch'))
    await signupPage.password.fill('aaaaaaaa')
    await signupPage.confirm.fill('bbbbbbbb')
    await signupPage.submit.click()
    await expect(signupPage.errorBox).toContainText(/passwords do not match/i)
    expect(page.url()).toContain('/signup')
  })

  test('rejects passwords shorter than 8 chars', async ({ signupPage }) => {
    await signupPage.goto()
    await signupPage.waitForTurnstileReady()
    await signupPage.name.fill('Short Pass')
    await signupPage.email.fill(ephemeralEmail('short'))
    await signupPage.password.fill('short')
    await signupPage.confirm.fill('short')
    await signupPage.submit.click()
    await expect(signupPage.errorBox).toContainText(/at least 8/i)
  })
})

test.describe('Login flow', () => {
  test('seeded test user can log in', async ({ loginPage, page }) => {
    await loginPage.goto()
    await loginPage.fillAndSubmit(USER.email, USER.password)
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 })
    // Profile menu should now show
    await expect(page.getByRole('link', { name: /sign in/i })).toHaveCount(0)
  })

  test('rejects bad password', async ({ loginPage, page }) => {
    await loginPage.goto()
    await loginPage.fillAndSubmit(USER.email, 'wrong-password-123')
    await expect(loginPage.errorBox).toContainText(/invalid email or password/i)
    expect(page.url()).toContain('/login')
  })

  test('rejects unknown email', async ({ loginPage }) => {
    await loginPage.goto()
    await loginPage.fillAndSubmit('nonexistent@hangarmarketplace.com', 'TestPassword123!')
    await expect(loginPage.errorBox).toContainText(/invalid email or password/i)
  })
})

test.describe('Forgot password', () => {
  test.skip(skipTurnstileInCI, 'Turnstile widget does not load on GitHub Actions runners.')

  test('always shows generic confirmation regardless of email existence', async ({ forgotPasswordPage }) => {
    await forgotPasswordPage.goto()
    await forgotPasswordPage.submitWithEmail('definitely-not-a-user@example.com')
    await expect(forgotPasswordPage.successHeading).toBeVisible({ timeout: 10_000 })
    // Generic copy — never reveals whether the address is registered
    await expect(forgotPasswordPage.page.locator('p')).toContainText(/if an account exists/i)
  })

  test('real seeded email is also accepted (cannot tell from UI alone)', async ({ forgotPasswordPage }) => {
    await forgotPasswordPage.goto()
    await forgotPasswordPage.submitWithEmail(USER.email)
    await expect(forgotPasswordPage.successHeading).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Login alerts', () => {
  test('records a login_event row when a known user signs in', async ({ loginPage, page }) => {
    const supabase = getTestSupabaseAdmin()
    const beforeRes = await supabase
      .from('user_login_events')
      .select('id', { count: 'exact', head: true })
      .eq('email', USER.email)
    const before = beforeRes.count ?? 0

    await loginPage.goto()
    await loginPage.fillAndSubmit(USER.email, USER.password)
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 })

    // The login server action awaits recordAndAlertLogin before redirect,
    // so by the time we're past /login the row should be in.
    await expect.poll(async () => {
      const res = await supabase
        .from('user_login_events')
        .select('id', { count: 'exact', head: true })
        .eq('email', USER.email)
      return res.count ?? 0
    }, { timeout: 8_000 }).toBeGreaterThan(before)
  })
})
