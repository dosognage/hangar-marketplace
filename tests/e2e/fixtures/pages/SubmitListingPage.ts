import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'
import { BasePage } from './BasePage'

/**
 * The /submit page is auth-gated. Tests must arrive here already logged in
 * (use the authenticatedPage fixture). The form is rendered by SubmitForm
 * (client component) with auto-populated contact fields.
 */
export class SubmitListingPage extends BasePage {
  constructor(page: Page) { super(page) }

  // Marker headings / first visible elements
  get formMounted():    Locator { return this.page.getByRole('heading', { name: /submit|list|new listing/i }).first() }

  // Contact fields (pre-populated; user can edit). Use input[name=...] to
  // bypass the global NewsletterSignup consent checkbox, whose label
  // contains "email" and otherwise wins the broad regex.
  get contactName():  Locator { return this.page.locator('input[name="contact_name"]') }
  get contactEmail(): Locator { return this.page.locator('input[name="contact_email"]') }
  get contactPhone(): Locator { return this.page.locator('input[name="contact_phone"]') }

  get title():        Locator { return this.page.locator('input[name="title"]') }
  get airportCode():  Locator { return this.page.locator('input[name="airport_code"]') }
  get askingPrice():  Locator { return this.page.locator('input[name="asking_price"]') }
  get description():  Locator { return this.page.locator('textarea[name="description"]') }

  get publishButton(): Locator { return this.page.getByRole('button', { name: /publish|submit listing|list it/i }) }
  get draftButton():   Locator { return this.page.getByRole('button', { name: /save draft|save as draft/i }) }

  async goto(): Promise<void> {
    await this.page.goto('/submit')
    await expect(this.formMounted).toBeVisible({ timeout: 15_000 })
  }
}
