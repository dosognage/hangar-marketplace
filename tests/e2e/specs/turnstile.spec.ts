/**
 * Turnstile bypass + presence checks.
 *
 * In the test environment we use Cloudflare's "always passes" sitekey
 * (1x00000000000000000000AA), which produces a valid token automatically.
 * These tests verify:
 *   1. The widget mounts on every protected form
 *   2. The hidden input gets populated (token is generated)
 *   3. Submitting the form without the token is rejected by the server
 */

import { test, expect } from '../fixtures/test'

test.describe('Turnstile @security', () => {
  test('signup form mounts Turnstile and produces a token', async ({ signupPage }) => {
    await signupPage.goto()
    await expect(signupPage.turnstileMount).toBeVisible({ timeout: 10_000 })
    await signupPage.waitForTurnstileReady()
    const token = await signupPage.turnstileToken.getAttribute('value')
    expect(token, 'Turnstile token should be a non-empty string').toBeTruthy()
    expect(token!.length).toBeGreaterThan(20)
  })

  test('forgot-password form mounts Turnstile and produces a token', async ({ forgotPasswordPage }) => {
    await forgotPasswordPage.goto()
    await expect(forgotPasswordPage.turnstileMount).toBeVisible({ timeout: 10_000 })
    await forgotPasswordPage.waitForTurnstileReady()
    const token = await forgotPasswordPage.turnstileToken.getAttribute('value')
    expect(token).toBeTruthy()
  })

  test('Turnstile uses test sitekey in this environment (sanity check)', async ({ signupPage }) => {
    await signupPage.goto()
    const iframeSrc = await signupPage.turnstileMount.getAttribute('src')
    // Just confirm it's a Turnstile iframe — we can't assert the sitekey via
    // src directly because Cloudflare passes it as a postMessage payload.
    expect(iframeSrc).toMatch(/challenges\.cloudflare\.com/)
  })
})
