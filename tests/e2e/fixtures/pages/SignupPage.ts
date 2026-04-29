import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'
import { BasePage } from './BasePage'

export class SignupPage extends BasePage {
  constructor(page: Page) { super(page) }

  get heading():       Locator { return this.page.getByRole('heading', { name: /create account/i }) }
  get name():          Locator { return this.page.getByLabel('Full name', { exact: true }) }
  // Exact label match — `/email/i` regex would also pick up the footer
  // newsletter consent checkbox. Same reason as LoginPage.
  get email():         Locator { return this.page.getByLabel('Email', { exact: true }) }
  get password():      Locator { return this.page.getByLabel('Password', { exact: true }) }
  get confirm():       Locator { return this.page.getByLabel('Confirm password', { exact: true }) }
  get marketingCheck(): Locator { return this.page.getByRole('checkbox') }
  get submit():        Locator { return this.page.getByRole('button', { name: /create account/i }) }
  get errorBox():      Locator { return this.page.locator('div[style*="dc2626"]').first() }

  /** Cloudflare's test sitekey passes silently — but the iframe still mounts. */
  get turnstileMount(): Locator { return this.page.locator('iframe[src*="challenges.cloudflare.com"]') }
  get turnstileToken(): Locator { return this.page.locator('input[name="cf-turnstile-response"]') }

  async goto(): Promise<void> {
    await this.page.goto('/signup')
    await expect(this.heading).toBeVisible()
  }

  async waitForTurnstileReady(): Promise<void> {
    // With the test sitekey (1x00000000000000000000AA) the widget produces a
    // valid token within ~1 second. Wait until the hidden input is populated.
    await expect(this.turnstileMount).toBeVisible({ timeout: 10_000 })
    await expect.poll(
      async () => (await this.turnstileToken.getAttribute('value')) ?? '',
      { timeout: 10_000, message: 'Turnstile test sitekey did not produce a token' },
    ).not.toEqual('')
  }

  async fillForm(opts: {
    name: string
    email: string
    password: string
    marketing?: boolean
  }): Promise<void> {
    await this.name.fill(opts.name)
    await this.email.fill(opts.email)
    await this.password.fill(opts.password)
    await this.confirm.fill(opts.password)
    if (opts.marketing) await this.marketingCheck.check()
  }
}
