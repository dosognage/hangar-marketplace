import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Lazy service-role Supabase client (same deferred-init pattern as lib/supabase.ts).
 *
 * PROBLEM: the original code called createClient() at MODULE LOAD TIME:
 *   export const supabaseAdmin = createClient(url, serviceKey)
 *
 * During Next.js / Turbopack server-bundle evaluation the env vars are not
 * yet resolved, so createClient throws "supabaseUrl is required" and crashes
 * every route that imported this module (all /api/admin/* routes).
 *
 * FIX: a Proxy that defers client creation until the first property access,
 * i.e. at actual request time when env vars are available.
 */

let _adminClient: SupabaseClient | null = null

function getAdminClient(): SupabaseClient {
  if (!_adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url) throw new Error('[supabase-admin] Missing env var: NEXT_PUBLIC_SUPABASE_URL')
    if (!key) throw new Error('[supabase-admin] Missing env var: SUPABASE_SERVICE_ROLE_KEY')
    _adminClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return _adminClient
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop: string | symbol) {
    return (getAdminClient() as any)[prop]
  },
})
