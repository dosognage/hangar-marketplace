/**
 * Pre-spec authentication setup.
 *
 * Runs once (as a Playwright "setup" project, before the rest of the suite)
 * to log in each role's seeded test user and save their cookies + storage
 * to disk. Subsequent tests then `test.use({ storageState: ... })` to start
 * pre-authenticated, skipping the login UI.
 *
 * This shaves ~3 seconds off every authenticated test and keeps spec files
 * focused on the behaviour they're actually testing instead of repeating
 * the same login dance over and over.
 */

import { test as setup, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { ADMIN, BROKER, USER, type TestUser } from '../helpers/test-users'

const AUTH_DIR = path.resolve(__dirname, '..', '.auth')

// Setup tests get a longer per-test timeout than the default 30s. The login
// server action awaits recordAndAlertLogin which makes 2–3 Supabase calls
// before redirecting; on a cold CI runner those round-trips can stretch to
// 30+ seconds. 90s gives plenty of slack without masking real bugs.
setup.setTimeout(90_000)

setup.beforeAll(() => {
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true })
})

async function loginAndSave(page: import('@playwright/test').Page, user: TestUser, file: string) {
  await page.goto('/login')
  // Scope to the form's actual <input type="email"|"password">. We can't
  // use getByLabel(/email/i) because the global NewsletterSignup component
  // has a checkbox labeled "I agree to receive ... emails" which sometimes
  // wins .first() depending on render order.
  await page.locator('input[type="email"]').first().fill(user.email)
  await page.locator('input[type="password"]').first().fill(user.password)
  await page.getByRole('button', { name: /sign in|log in/i }).click()

  try {
    // Successful login redirects away from /login. The login action awaits
    // recordAndAlertLogin (2-3 Supabase calls), which on a cold CI runner
    // can take 30+ seconds. 75s leaves headroom under the 90s test timeout.
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 75_000 })
  } catch (e) {
    // Surface the actual reason so we don't have to scrape Playwright
    // traces every time. Most common causes: wrong password (Invalid
    // email or password banner), missing test user (same banner),
    // Turnstile not bypassed (button stays disabled).
    const errorText = await page
      .locator('[role="alert"], .error, [data-error]')
      .first()
      .textContent()
      .catch(() => null)
    const url = page.url()
    throw new Error(
      `[auth.setup] Login did not redirect within 75s for ${user.email}. ` +
      `URL=${url}. Form error: ${errorText ?? '(none captured)'}`,
    )
  }

  // Sanity-check: we should now be authenticated
  await expect(page.getByRole('link', { name: /sign in/i })).toHaveCount(0)
  await page.context().storageState({ path: file })
}

setup('authenticate as admin', async ({ page }) => {
  await loginAndSave(page, ADMIN, path.join(AUTH_DIR, 'admin.json'))
})

setup('authenticate as broker', async ({ page }) => {
  await loginAndSave(page, BROKER, path.join(AUTH_DIR, 'broker.json'))
})

setup('authenticate as regular user', async ({ page }) => {
  await loginAndSave(page, USER, path.join(AUTH_DIR, 'user.json'))
})
