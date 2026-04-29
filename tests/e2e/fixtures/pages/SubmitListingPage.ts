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

  // Contact fields (pre-populated; user can edit)
  get contactName():  Locator { return this.page.getByLabel(/contact name|name/i).first() }
  get contactEmail(): Locator { return this.page.getByLabel(/contact email|email/i).first() }
  get contactPhone(): Locator { return this.page.getByLabel(/contact phone|phone/i).first() }

  get title():        Locator { return this.page.getByLabel(/listing title|title/i).first() }
  get airportCode():  Locator { return this.page.getByLabel(/airport.*code|icao/i).first() }
  get askingPrice():  Locator { return this.page.getByLabel(/asking price/i).first() }
  get description():  Locator { return this.page.getByLabel(/description/i).first() }

  get publishButton(): Locator { return this.page.getByRole('button', { name: /publish|submit listing|list it/i }) }
  get draftButton():   Locator { return this.page.getByRole('button', { name: /save draft|save as draft/i }) }

  async goto(): Promise<void> {
    await this.page.goto('/submit')
    await expect(this.formMounted).toBeVisible({ timeout: 15_000 })
  }
}
