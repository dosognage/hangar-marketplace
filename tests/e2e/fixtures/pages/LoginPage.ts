import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'
import { BasePage } from './BasePage'

export class LoginPage extends BasePage {
  constructor(page: Page) { super(page) }

  get heading():  Locator { return this.page.getByRole('heading', { name: /sign in|log in|welcome back/i }) }
  // Use exact label match — the loose `/email/i` regex picks up the
  // footer newsletter consent checkbox ("I agree to receive ... email ...").
  get email():    Locator { return this.page.getByLabel('Email', { exact: true }) }
  get password(): Locator { return this.page.getByLabel('Password', { exact: true }) }
  get submit():   Locator { return this.page.getByRole('button', { name: /sign in|log in/i }) }
  // Use the data-testid we added to login/page.tsx. Don't use [role="alert"]
  // alone — Next.js's __next-route-announcer__ also has role="alert" and
  // wins .first() ordering in production builds.
  get errorBox(): Locator { return this.page.locator('[data-testid="login-error"]') }
  get forgotPasswordLink(): Locator { return this.page.getByRole('link', { name: /forgot/i }) }
  get signupLink():         Locator { return this.page.getByRole('link', { name: /sign up|create account|new account/i }) }

  async goto(next?: string): Promise<void> {
    const url = next ? `/login?next=${encodeURIComponent(next)}` : '/login'
    await this.page.goto(url)
    await expect(this.heading).toBeVisible()
  }

  async fillAndSubmit(email: string, password: string): Promise<void> {
    await this.email.fill(email)
    await this.password.fill(password)

    // H1 added a Turnstile gate to the login server action. On GitHub
    // Actions runners the Turnstile iframe doesn't load (network-restricted
    // — same reason auth.spec.ts skips signup-happy-path in CI), so the
    // cf-turnstile-response field never gets a real token and the server
    // returns "Please complete the captcha". The test environment uses
    // Cloudflare's "always passes" secret key (1x000…AA) which accepts
    // ANY non-empty token, so injecting a placeholder is enough. Locally
    // where the iframe DOES load, our placeholder is harmless because the
    // iframe's onPass overwrites it with the real token before submit.
    await this.page.evaluate(() => {
      let input = document.querySelector('input[name="cf-turnstile-response"]') as HTMLInputElement | null
      if (!input) {
        input = document.createElement('input')
        input.type = 'hidden'
        input.name = 'cf-turnstile-response'
        document.querySelector('form')?.appendChild(input)
      }
      if (!input.value) input.value = 'e2e-bypass-token'
    })

    await this.submit.click()
  }

  async expectLoginSuccess(redirectsTo: string | RegExp = '/'): Promise<void> {
    await this.page.waitForURL(redirectsTo)
  }
}
