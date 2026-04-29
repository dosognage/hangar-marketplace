/**
 * Test-data cleanup utilities.
 *
 * Used after specs that create ephemeral data so the test branch doesn't
 * accumulate cruft. The seeded test users (ADMIN/BROKER/USER) are kept;
 * anything created by `ephemeralEmail()` or with the `e2e_test_data`
 * marker is removed.
 */

import { getTestSupabaseAdmin } from './supabase-admin'

const E2E_EMAIL_PATTERN = 'e2e+%@hangarmarketplace.com'

/** Delete users whose email matches the ephemeral pattern, except seeded ones. */
export async function deleteEphemeralUsers(keepEmails: string[] = []): Promise<void> {
  const supabase = getTestSupabaseAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).auth.admin.listUsers({ perPage: 1000 })
  if (error) throw error
  const users = (data?.users ?? []) as Array<{ id: string; email?: string | null }>
  for (const u of users) {
    if (!u.email) continue
    if (!u.email.startsWith('e2e+')) continue
    if (keepEmails.includes(u.email)) continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).auth.admin.deleteUser(u.id).catch(() => undefined)
  }
}

/** Delete listings created by tests (filtered by the canonical contact email). */
export async function deleteEphemeralListings(): Promise<void> {
  const supabase = getTestSupabaseAdmin()
  await supabase
    .from('listings')
    .delete()
    .like('contact_email', E2E_EMAIL_PATTERN)
}

/** Delete test broker_applications + broker_profiles by email pattern. */
export async function deleteEphemeralBrokerData(): Promise<void> {
  const supabase = getTestSupabaseAdmin()
  await supabase.from('broker_applications').delete().like('email', E2E_EMAIL_PATTERN)
  await supabase.from('broker_profiles').delete().like('contact_email', E2E_EMAIL_PATTERN)
}

/** Run all cleanup steps. Used in globalTeardown. */
export async function cleanupAll(keepEmails: string[] = []): Promise<void> {
  await Promise.allSettled([
    deleteEphemeralListings(),
    deleteEphemeralBrokerData(),
    deleteEphemeralUsers(keepEmails),
  ])
}
