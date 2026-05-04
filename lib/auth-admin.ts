/**
 * Admin authorization helpers — single source of truth for "is this user an admin?"
 *
 * Why this file exists
 * --------------------
 * The same `(process.env.ADMIN_EMAILS ?? '').split(',').map(...).includes(...)`
 * snippet was duplicated across 22 files (admin pages, admin API routes,
 * server actions, the proxy, etc.). Each copy had slightly different
 * normalisation:
 *   - Some called `.filter(Boolean)`; others didn't (so trailing commas
 *     in the env var would leave an empty string in the allowlist that
 *     `''.includes(email)` would match falsely).
 *   - Some lowercased BOTH sides of the comparison; others only one
 *     (so an admin email with a capital letter could fail the check).
 *   - Some re-parsed the env var on every call; one file cached it at
 *     module-scope (so later updates to the env wouldn't be picked up
 *     without redeploy — actually fine in production, but inconsistent).
 *
 * Centralising removes a whole class of subtle bugs and makes future
 * changes (e.g. domain-allowlist mode, audit logging on every admin
 * action) a one-file change instead of a 22-file refactor.
 */

import type { User } from '@supabase/supabase-js'

/**
 * Parse the ADMIN_EMAILS env var into a normalised allowlist set.
 * Always lowercased + trimmed. Falsy entries (from trailing commas)
 * are filtered out so `[''].includes('')` can't match.
 *
 * Read from env on every call rather than caching at module-load time —
 * this matters in tests where the env can be mutated, and is a no-op
 * cost in production (the env var is already a string).
 */
function adminEmailSet(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean),
  )
}

/**
 * Is this email address in the admin allowlist?
 * Lowercases the input so case doesn't matter.
 * Returns false for null/undefined/empty so callers don't need to guard.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return adminEmailSet().has(email.toLowerCase())
}

/**
 * Convenience for the most common pattern in API routes:
 *
 *   const supabase = await createServerClient()
 *   const { data: { user } } = await supabase.auth.getUser()
 *   if (!isAdminUser(user)) return NextResponse.json(...403...)
 *
 * Accepts the Supabase User object (or null/undefined) and returns true
 * only when the user exists AND their email is in the allowlist.
 */
export function isAdminUser(user: User | null | undefined): boolean {
  return isAdminEmail(user?.email)
}

/**
 * Returns the full normalised admin email list. Use only when you need
 * to ITERATE over admins (e.g. send each one an in-app notification).
 * For "is X an admin?" checks, prefer isAdminEmail / isAdminUser.
 */
export function adminEmailList(): string[] {
  return [...adminEmailSet()]
}
