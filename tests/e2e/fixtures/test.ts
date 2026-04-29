/**
 * Custom Playwright test fixture.
 *
 * Extends the base test with:
 *   - per-role authenticated browser contexts (admin / broker / user)
 *   - convenient page-object instances pre-attached to `test.use({...})` users
 *
 * Usage:
 *   import { test, expect } from '@/tests/e2e/fixtures/test'
 *   test('admin sees applications', async ({ adminPage }) => {
 *     await adminPage.goto()
 *     await expect(adminPage.heading).toBeVisible()
 *   })
 *
 * The auth states are pre-baked by tests/e2e/setup/auth.setup.ts so each
 * spec starts already-logged-in without paying the cost of going through
 * the login page UI on every test.
 */

import { test as base, expect } from '@playwright/test'
import { AdminPage }          from './pages/AdminPage'
import { BasePage }           from './pages/BasePage'
import { BrokerApplyPage }    from './pages/BrokerApplyPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LoginPage }          from './pages/LoginPage'
import { SettingsPage }       from './pages/SettingsPage'
import { SignupPage }         from './pages/SignupPage'
import { SubmitListingPage }  from './pages/SubmitListingPage'

type Fixtures = {
  basePage:           BasePage
  loginPage:          LoginPage
  signupPage:         SignupPage
  forgotPasswordPage: ForgotPasswordPage
  settingsPage:       SettingsPage
  submitListingPage:  SubmitListingPage
  brokerApplyPage:    BrokerApplyPage
  adminPage:          AdminPage
}

export const test = base.extend<Fixtures>({
  basePage:           async ({ page }, use) => use(new BasePage(page)),
  loginPage:          async ({ page }, use) => use(new LoginPage(page)),
  signupPage:         async ({ page }, use) => use(new SignupPage(page)),
  forgotPasswordPage: async ({ page }, use) => use(new ForgotPasswordPage(page)),
  settingsPage:       async ({ page }, use) => use(new SettingsPage(page)),
  submitListingPage:  async ({ page }, use) => use(new SubmitListingPage(page)),
  brokerApplyPage:    async ({ page }, use) => use(new BrokerApplyPage(page)),
  adminPage:          async ({ page }, use) => use(new AdminPage(page)),
})

export { expect }

/**
 * Helper for specs that need authenticated state. Use as:
 *   test.use({ storageState: AUTH_STATES.admin })
 *
 * The .auth files are produced by setup/auth.setup.ts and gitignored.
 */
export const AUTH_STATES = {
  admin:  'tests/e2e/.auth/admin.json',
  broker: 'tests/e2e/.auth/broker.json',
  user:   'tests/e2e/.auth/user.json',
} as const
