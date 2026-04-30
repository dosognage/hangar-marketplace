import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'
import { BasePage } from './BasePage'

export class SettingsPage extends BasePage {
  constructor(page: Page) { super(page) }

  get heading(): Locator { return this.page.getByRole('heading', { name: /profile settings|settings/i }).first() }

  // Profile fields. Use input[name=...] / specific id selectors to avoid
  // matching the global NewsletterSignup component's email input which
  // also has type="email" and lives in the footer.
  get fullName():        Locator { return this.page.locator('input[name="full_name"]') }
  get phone():           Locator { return this.page.locator('input[name="phone"]') }
  get email():           Locator { return this.page.locator('#email') }
  get currentPassword(): Locator { return this.page.locator('input[name="current_password"]') }
  get saveProfile():     Locator { return this.page.getByRole('button', { name: /save profile/i }) }

  get reauthBanner(): Locator { return this.page.locator('text=/security-sensitive action/i') }

  // React renders hex colors as rgb(), so [style*="dc2626"] never matches.
  // Use the data-testid we added to ProfileForm.tsx.
  get successBox(): Locator { return this.page.locator('[data-testid="profile-success"]') }
  get errorBox():   Locator { return this.page.locator('[data-testid="profile-error"]') }

  async goto(): Promise<void> {
    await this.page.goto('/settings')
    await expect(this.heading).toBeVisible({ timeout: 15_000 })
  }
}
