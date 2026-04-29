/**
 * Service-role Supabase client for tests.
 *
 * Used by helpers and fixtures to set up / tear down test data directly
 * (bypassing RLS), and to look up state when assertions need to verify
 * server-side records (e.g. "did the webhook actually update sponsored_until").
 *
 * NEVER import this from production code. Only test modules use it.
 */

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getTestSupabaseAdmin(): SupabaseClient {
  if (_client) return _client

  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !service) {
    throw new Error(
      '[tests/supabase-admin] Missing NEXT_PUBLIC_SUPABASE_URL or ' +
      'SUPABASE_SERVICE_ROLE_KEY. These should point at the e2e-test ' +
      'branch — see tests/.env.test.example.',
    )
  }

  // Sanity guard: make sure we're NOT pointing at production. The test
  // branch ref is pukcxxgafgrieetkgogy. The production ref is
  // tokvsbyokppnyxbthysd. If a developer accidentally points tests at prod
  // we fail loud here rather than silently mutating real data.
  if (url.includes('tokvsbyokppnyxbthysd')) {
    throw new Error(
      '[tests/supabase-admin] REFUSING to run: NEXT_PUBLIC_SUPABASE_URL ' +
      'points at production. Tests must use the e2e-test branch. Check .env.test.',
    )
  }

  _client = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _client
}
