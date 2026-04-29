/**
 * Settings page password re-auth — required when the user changes their
 * email. Email is the account-recovery vector so we gate it explicitly
 * even though the user is already authenticated.
 */

import { test, expect, AUTH_STATES } from '../fixtures/test'
import { USER } from '../helpers/test-users'

test.use({ storageState: AUTH_STATES.user })

test.describe('Settings — email change reauth', () => {
  test('changing email reveals the password field', async ({ settingsPage }) => {
    await settingsPage.goto()
    // The current email is auto-populated; password field should NOT be visible
    await expect(settingsPage.currentPassword).toHaveCount(0)

    // Edit the email — password field should appear
    await settingsPage.email.fill('changed+temp@hangarmarketplace.com')
    await expect(settingsPage.currentPassword).toBeVisible({ timeout: 4_000 })
  })

  test('email change without password fails', async ({ settingsPage }) => {
    await settingsPage.goto()
    await settingsPage.email.fill('changed+nopw@hangarmarketplace.com')
    await expect(settingsPage.currentPassword).toBeVisible()
    // Submit without filling password
    await settingsPage.saveProfile.click()
    await expect(settingsPage.errorBox).toContainText(/please enter your password/i)
  })

  test('email change with WRONG password fails', async ({ settingsPage }) => {
    await settingsPage.goto()
    await settingsPage.email.fill('changed+wrongpw@hangarmarketplace.com')
    await settingsPage.currentPassword.fill('this-is-not-the-right-password')
    await settingsPage.saveProfile.click()
    await expect(settingsPage.errorBox).toContainText(/incorrect password/i)
  })

  test('saving name + phone WITHOUT changing email does not require password', async ({ settingsPage }) => {
    await settingsPage.goto()
    // Restore email if a previous test left it dirty (test isolation safety)
    await settingsPage.email.fill(USER.email)
    await settingsPage.fullName.fill('E2E User Updated')
    await settingsPage.phone.fill('555-0199')
    // Password field must NOT be required since email is unchanged
    await expect(settingsPage.currentPassword).toHaveCount(0)
    await settingsPage.saveProfile.click()
    await expect(settingsPage.successBox).toBeVisible({ timeout: 8_000 })
  })
})
