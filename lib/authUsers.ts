import { supabaseAdmin } from './supabase-admin'

/**
 * List every Supabase auth user, paginating through all pages.
 *
 * supabaseAdmin.auth.admin.listUsers() returns at most 1000 users per page.
 * The day this app crosses 1000 accounts, single-page callers silently miss
 * everyone past page 1. This helper loops until exhaustion.
 *
 * Practical scale check: at 100k users this returns 100k objects in memory,
 * which is fine but not free. Use {filter} to constrain when possible.
 */
export type AuthUserLite = {
  id:    string
  email: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user_metadata?: Record<string, any>
}

const PER_PAGE = 1000
const MAX_PAGES = 100  // safety cap: 100k users before we bail

export async function listAllAuthUsers(opts?: {
  filter?: (u: AuthUserLite) => boolean
}): Promise<AuthUserLite[]> {
  const all: AuthUserLite[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any).auth.admin.listUsers({ page, perPage: PER_PAGE })
    if (error) {
      console.error('[authUsers] listUsers page', page, 'failed:', error.message)
      break
    }
    const users: AuthUserLite[] = data?.users ?? []
    if (users.length === 0) break

    if (opts?.filter) {
      for (const u of users) if (opts.filter(u)) all.push(u)
    } else {
      all.push(...users)
    }

    // Last page reached — stop.
    if (users.length < PER_PAGE) break
  }
  return all
}

/**
 * Resolve a set of auth user_ids to their email addresses. Useful for the
 * 50mi alert dispatchers and admin notifiers that already have user_ids in
 * hand and just need their inboxes.
 */
export async function emailsByUserId(userIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (userIds.length === 0) return out

  const wanted = new Set(userIds)
  const users = await listAllAuthUsers({
    filter: u => wanted.has(u.id),
  })
  for (const u of users) {
    if (u.email) out.set(u.id, u.email)
  }
  return out
}
