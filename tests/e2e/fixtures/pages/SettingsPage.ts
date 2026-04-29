import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'
import { BasePage } from './BasePage'

export class SettingsPage extends BasePage {
  constructor(page: Page) { super(page) }

  get heading(): Locator { return this.page.getByRole('heading', { name: /profile settings|settings/i }).first() }

  // Profile fields
  get fullName():        Locator { return this.page.getByLabel(/display name/i) }
  get phone():           Locator { return this.page.getByLabel(/phone/i) }
  get email():           Locator { return this.page.getByLabel(/^email/i).first() }
  get currentPassword(): Locator { return this.page.getByLabel(/current password/i) }
  get saveProfile():     Locator { return this.page.getByRole('button', { name: /save profile/i }) }

  get reauthBanner(): Locator { return this.page.locator('text=/security-sensitive action/i') }

  get successBox(): Locator { return this.page.locator('div[style*="166534"]').first() }
  get errorBox():   Locator { return this.page.locator('div[style*="dc2626"]').first() }

  async goto(): Promise<void> {
    await this.page.goto('/settings')
    await expect(this.heading).toBeVisible({ timeout: 15_000 })
  }
}
