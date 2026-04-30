import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'
import { BasePage } from './BasePage'

/**
 * Admin dashboard. Tabbed view with sections for Listings, Homes/Land/Fly-in,
 * Broker Applications, Aircraft Requests, etc.
 */
export class AdminPage extends BasePage {
  constructor(page: Page) { super(page) }

  get heading(): Locator { return this.page.getByRole('heading', { name: /admin/i }).first() }

  // ── Broker application row interaction ─────────────────────────────────
  approveButtonFor(applicationId: string): Locator {
    return this.page.locator(`[data-application-id="${applicationId}"]`).getByRole('button', { name: /^approve$/i })
  }

  /** Generic approve button if data-application-id isn't wired. */
  get firstApproveButton(): Locator { return this.page.getByRole('button', { name: /^approve$/i }).first() }
  get firstRejectButton():  Locator { return this.page.getByRole('button', { name: /^reject$/i }).first() }

  // After clicking Approve, the inline confirm form appears
  get confirmPasswordInput(): Locator { return this.page.getByPlaceholder(/your password/i) }
  get confirmApproveButton(): Locator { return this.page.getByRole('button', { name: /confirm approve/i }) }
  get cancelApproveButton():  Locator { return this.page.getByRole('button', { name: /^cancel$/i }) }

  // ── Comp sponsor flow (modal) ──────────────────────────────────────────
  /** Comp button on a listing card — accepts duration "7", "30", or "90". */
  compButton(days: 7 | 30 | 90): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^Comp ${days}d$`, 'i') }).first()
  }
  extendButton(days: 7 | 30 | 90): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^Extend ${days}d$`, 'i') }).first()
  }

  // PasswordPromptModal
  get passwordModal():       Locator { return this.page.getByRole('heading', { name: /comp .* sponsorship/i }) }
  get passwordModalInput():  Locator { return this.page.getByPlaceholder(/current password/i) }
  get passwordModalConfirm(): Locator { return this.page.getByRole('button', { name: /comp it/i }) }
  get passwordModalCancel(): Locator { return this.page.getByRole('button', { name: /^cancel$/i }) }
  get passwordModalError():  Locator { return this.page.locator('[data-testid="password-modal-error"]') }

  async goto(): Promise<void> {
    await this.page.goto('/admin')
    await expect(this.heading).toBeVisible({ timeout: 15_000 })
  }
}
