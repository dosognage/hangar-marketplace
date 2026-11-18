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
  // By id: the footer newsletter form adds a second checkbox to every page.
  get marketingCheck(): Locator { return this.page.locator('#marketingConsent') }
  get submit():        Locator { return this.page.getByRole('button', { name: /create account/i }) }
  // The data-testid on signup/page.tsx, not the inline color, which changed.
  get errorBox():      Locator { return this.page.getByTestId('signup-error') }

  /**
   * The widget's container (@marsidev/react-turnstile renders id="cf-turnstile").
   * Cloudflare now draws its iframe inside a closed shadow root under this
   * div, so the iframe itself is not reachable from the page; the container
   * and the hidden token input are.
   */
  get turnstileMount(): Locator { return this.page.locator('#cf-turnstile') }
  /** Cloudflare's Turnstile script, proof the widget came from Cloudflare. */
  get turnstileScript(): Locator { return this.page.locator('script[src*="challenges.cloudflare.com/turnstile"]') }
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
