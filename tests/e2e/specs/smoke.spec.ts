/**
 * Smoke tests — the quickest possible "is the site alive and rendering"
 * sanity check. Runs first; if any of these fail, deeper specs are likely
 * to flake and we should investigate the deploy itself.
 *
 * These tests are deliberately low-fidelity. They only assert that pages
 * mount without errors and that critical landmarks are visible. Behavioural
 * tests live in the role-specific spec files.
 */

import { test, expect } from '../fixtures/test'

test.describe('Smoke @smoke', () => {
  test('homepage renders with header + hero', async ({ basePage, page }) => {
    await basePage.gotoHome()
    await expect(basePage.logo).toBeVisible()
    await expect(basePage.navBrowse).toBeVisible()
    await expect(basePage.navSubmit).toBeVisible()
    // No console errors on home (filtered to JS errors only — the analytics
    // libraries can produce warnings we don't care about).
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.waitForLoadState('networkidle')
    expect(errors, `Homepage threw page errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('login page renders', async ({ loginPage }) => {
    await loginPage.goto()
    await expect(loginPage.heading).toBeVisible()
    await expect(loginPage.email).toBeVisible()
    await expect(loginPage.password).toBeVisible()
    await expect(loginPage.submit).toBeVisible()
    await expect(loginPage.forgotPasswordLink).toBeVisible()
    await expect(loginPage.signupLink).toBeVisible()
  })

  test('signup page renders all form fields', async ({ signupPage }) => {
    await signupPage.goto()
    await expect(signupPage.heading).toBeVisible()
    await expect(signupPage.name).toBeVisible()
    await expect(signupPage.email).toBeVisible()
    await expect(signupPage.password).toBeVisible()
    await expect(signupPage.confirm).toBeVisible()
    await expect(signupPage.submit).toBeVisible()
    // NOTE: We deliberately do not assert on the Turnstile iframe mounting
    // here. Production uses the real Turnstile sitekey, and Cloudflare's
    // bot detection often refuses to inject the iframe for headless browsers
    // (which is the whole point of Turnstile). The Turnstile-specific spec
    // (turnstile.spec.ts) verifies iframe behavior against an environment
    // configured with the test sitekey (which always passes).
  })

  test('forgot-password page renders all form fields', async ({ forgotPasswordPage }) => {
    await forgotPasswordPage.goto()
    await expect(forgotPasswordPage.heading).toBeVisible()
    await expect(forgotPasswordPage.email).toBeVisible()
    await expect(forgotPasswordPage.submit).toBeVisible()
  })

  test('public pages are reachable from nav', async ({ basePage, page }) => {
    await basePage.gotoHome()
    for (const [linkName, urlMatcher] of [
      ['Airport Homes', /\/airport-homes/],
      ['Requests',      /\/requests/],
      ['Brokers',       /\/brokers/],
    ] as const) {
      await page.getByRole('link', { name: linkName, exact: true }).first().click()
      await expect(page).toHaveURL(urlMatcher)
      await page.goBack()
    }
  })
})

test.describe('Auth-gated routes redirect to login @smoke', () => {
  for (const route of ['/submit', '/apply-broker', '/requests/new', '/dashboard', '/settings']) {
    test(`${route} → /login when unauthenticated`, async ({ page }) => {
      await page.goto(route)
      // The auth gate redirects to /login?next=<route>. Production uses
      // an unencoded slash in the next= param (Next.js redirect()). Match
      // either encoded or unencoded form to be robust.
      const escaped = route.replace(/\//g, '\\/')
      const encoded = encodeURIComponent(route)
      await expect(page).toHaveURL(new RegExp(`/login\\?next=(${escaped}|${encoded})`))
    })
  }
})
