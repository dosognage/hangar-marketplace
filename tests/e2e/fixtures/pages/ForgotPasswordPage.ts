import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'
import { BasePage } from './BasePage'

export class ForgotPasswordPage extends BasePage {
  constructor(page: Page) { super(page) }

  get heading():        Locator { return this.page.getByRole('heading', { name: /reset your password/i }) }
  // Exact label match — see LoginPage for context.
  get email():          Locator { return this.page.getByLabel(/email\s*address/i) }
  get submit():         Locator { return this.page.getByRole('button', { name: /send reset link/i }) }
  get successHeading(): Locator { return this.page.getByRole('heading', { name: /check your email/i }) }
  get errorBox():       Locator { return this.page.locator('div[style*="dc2626"]').first() }

  get turnstileMount(): Locator { return this.page.locator('iframe[src*="challenges.cloudflare.com"]') }
  get turnstileToken(): Locator { return this.page.locator('input[name="cf-turnstile-response"]') }

  async goto(): Promise<void> {
    await this.page.goto('/forgot-password')
    await expect(this.heading).toBeVisible()
  }

  async waitForTurnstileReady(): Promise<void> {
    await expect(this.turnstileMount).toBeVisible({ timeout: 10_000 })
    await expect.poll(
      async () => (await this.turnstileToken.getAttribute('value')) ?? '',
      { timeout: 10_000 },
    ).not.toEqual('')
  }

  async submitWithEmail(email: string): Promise<void> {
    await this.email.fill(email)
    await this.waitForTurnstileReady()
    await this.submit.click()
  }
}
