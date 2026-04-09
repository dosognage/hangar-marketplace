import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Lazy Supabase anon client.
 *
 * PROBLEM the old code had:
 *   export const supabase = createClient(url, key)  ← runs at MODULE LOAD TIME
 *
 * During Next.js / Turbopack server-bundle evaluation the env vars may not
 * yet be resolved, causing `createClient` to throw "supabaseUrl is required"
 * and crashing every server route that imported this module.
 *
 * FIX: a Proxy that defers client creation until the first property access.
 * All callers continue using `supabase.from(...)` with zero changes.
 */

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url) throw new Error('[supabase] Missing env var: NEXT_PUBLIC_SUPABASE_URL')
    if (!key) throw new Error('[supabase] Missing env var: NEXT_PUBLIC_SUPABASE_ANON_KEY')
    _client = createClient(url, key)
  }
  return _client
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop: string | symbol) {
    return (getClient() as any)[prop]
  },
})
