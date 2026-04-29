/**
 * Base Page Object — shared behaviours every page needs.
 *
 * Subclass this for each page so tests don't sprinkle CSS selectors
 * across spec files. When the UI changes, you fix the POM in one place
 * and every test that touches that page keeps working.
 */

import type { Page, Locator } from '@playwright/test'

export class BasePage {
  constructor(public readonly page: Page) {}

  // ── Header / navigation ────────────────────────────────────────────────
  get logo():        Locator { return this.page.getByRole('link', { name: /Hangar Marketplace/i }).first() }
  get navBrowse():   Locator { return this.page.getByRole('link', { name: 'Browse',          exact: true }).first() }
  get navHomes():    Locator { return this.page.getByRole('link', { name: 'Airport Homes',   exact: true }).first() }
  get navRequests(): Locator { return this.page.getByRole('link', { name: 'Requests',        exact: true }).first() }
  get navBrokers():  Locator { return this.page.getByRole('link', { name: 'Brokers',         exact: true }).first() }
  get navSubmit():   Locator { return this.page.getByRole('link', { name: 'List a Property', exact: true }).first() }
  get navSignIn():   Locator { return this.page.getByRole('link', { name: 'Sign in',         exact: true }).first() }
  get navSignUp():   Locator { return this.page.getByRole('link', { name: 'Sign up',         exact: true }).first() }

  // Profile dropdown (only present when authenticated)
  get profileMenu(): Locator { return this.page.getByRole('button', { name: /Andre|profile|account/i }).first() }

  // ── Common helpers ────────────────────────────────────────────────────
  async gotoHome(): Promise<void> {
    await this.page.goto('/')
  }

  /** Wait for the next-route navigation to settle (Next.js + RSC streaming). */
  async waitForRouteIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
  }

  /** Capture a screenshot at the current state, named by tag. */
  async snap(tag: string): Promise<void> {
    await this.page.screenshot({ path: `tests/e2e/.test-results/${tag}.png`, fullPage: true })
  }
}
