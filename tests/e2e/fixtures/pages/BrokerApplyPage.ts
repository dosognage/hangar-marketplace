import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'
import { BasePage } from './BasePage'

export class BrokerApplyPage extends BasePage {
  constructor(page: Page) { super(page) }

  get heading():       Locator { return this.page.getByRole('heading', { name: /apply.*broker|broker verification|become a verified broker/i }).first() }
  get fullName():      Locator { return this.page.getByLabel(/full legal name|full name/i).first() }
  get brokerage():     Locator { return this.page.getByLabel(/brokerage|firm name/i).first() }
  get licenseState():  Locator { return this.page.getByLabel(/license state/i).first() }
  get licenseNumber(): Locator { return this.page.getByLabel(/license number/i).first() }
  get unlicensed():    Locator { return this.page.getByLabel(/i don't have a license|unlicensed/i).first() }
  get phone():         Locator { return this.page.getByLabel(/phone/i).first() }
  get website():       Locator { return this.page.getByLabel(/website/i).first() }
  get bio():           Locator { return this.page.getByLabel(/bio|about you/i).first() }
  get submit():        Locator { return this.page.getByRole('button', { name: /submit application|apply|send application/i }).first() }
  get successBanner(): Locator { return this.page.locator('text=/application received|thanks for applying/i').first() }

  async goto(): Promise<void> {
    await this.page.goto('/apply-broker')
    await expect(this.heading).toBeVisible({ timeout: 15_000 })
  }
}
