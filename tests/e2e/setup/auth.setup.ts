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

setup.beforeAll(() => {
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true })
})

async function loginAndSave(page: import('@playwright/test').Page, user: TestUser, file: string) {
  await page.goto('/login')
  await page.getByLabel(/email/i).first().fill(user.email)
  await page.getByLabel(/password/i).first().fill(user.password)
  await page.getByRole('button', { name: /sign in|log in/i }).click()
  // Successful login redirects away from /login. Wait for that.
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 })
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
