/**
 * Test user accounts used across the suite.
 *
 * These users are seeded on the e2e-test Supabase branch by
 * tests/e2e/setup/seed.ts before any specs run. They persist across runs.
 *
 * Pattern: e2e+role@hangarmarketplace.com lets us identify them at a
 * glance and use a single inbox (e2e+@gmail) if we ever route their email.
 */

export type TestUser = {
  email:    string
  password: string
  fullName: string
  role:     'admin' | 'broker' | 'user'
}

// Use `||` (not `??`) so that empty-string env vars fall through to the
// defaults. GitHub Actions renders unset secrets as '', which would
// otherwise silently produce empty passwords and timeouts on login.
export const ADMIN: TestUser = {
  email:    process.env.TEST_ADMIN_EMAIL    || 'e2e+admin@hangarmarketplace.com',
  password: process.env.TEST_ADMIN_PASSWORD || 'e2e-test-admin-pwd-2026',
  fullName: 'E2E Admin',
  role:     'admin',
}

export const BROKER: TestUser = {
  email:    process.env.TEST_BROKER_EMAIL    || 'e2e+broker@hangarmarketplace.com',
  password: process.env.TEST_BROKER_PASSWORD || 'e2e-test-broker-pwd-2026',
  fullName: 'E2E Broker',
  role:     'broker',
}

export const USER: TestUser = {
  email:    process.env.TEST_USER_EMAIL    || 'e2e+user@hangarmarketplace.com',
  password: process.env.TEST_USER_PASSWORD || 'e2e-test-user-pwd-2026',
  fullName: 'E2E User',
  role:     'user',
}

/** Unique per-test email pattern for one-off signups that we don't keep. */
export function ephemeralEmail(prefix = 'eph'): string {
  const ts = Date.now()
  const rnd = Math.random().toString(36).slice(2, 8)
  return `e2e+${prefix}-${ts}-${rnd}@hangarmarketplace.com`
}
